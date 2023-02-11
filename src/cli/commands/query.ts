import { OutputLevel } from '../../index.js';
import { SgCommand } from '../index.js';
import { Flags } from '@oclif/core';
import { Query as QueryBuilder } from '../../reports/index.js'
import { Spreadsheet } from '../../index.js';
import { JsonMap } from '@salesforce/ts-types';
import _ from 'lodash';
import { readFile } from 'fs/promises';
import { aql, literal, GeneratedAqlQuery } from 'arangojs/aql.js'
import * as csv from 'fast-csv';
import is from '@sindresorhus/is';

export default class Query extends SgCommand {
  static aliases = ['report'];

  static summary = 'Query the Spidergram crawl data';

  static flags = {
    // Basic query information
    input: Flags.string({
      char: 'i',
      summary: 'A file containing an Arango query spec',
    }),
    output: Flags.string({
      char: 'o',
      summary: 'Output filename',
    }),
    collection: Flags.string({
      char: 'c',
      summary: 'The Arango collection to be queried',
      default: 'resources'
    }),
    filter: Flags.string({
      char: 'f',
      summary: '-',
      multiple: true,
    }),
    return: Flags.string({
      char: 'r',
      summary: 'Properties to include in the return value',
      multiple: true
    }),
    returnFilter: Flags.string({
      aliases: ['rf'],
      summary: '-',
      multiple: true,
    }),
    sort: Flags.string({
      summary: 'Sort results by a property',
      multiple: true,
    }),
    limit: Flags.integer({
      summary: 'The Arango collection to be queried',
      default: 20
    }),

    // Collect/aggregate
    group: Flags.string({
      aliases: ['collect'],
      summary: 'Group the results by a property',
      multiple: true,
      helpGroup: 'Aggregation'
    }),
    empty: Flags.string({
      summary: 'COUNT_EMPTY() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation'
    }),
    nonempty: Flags.string({
      summary: 'COUNT_EMPTY() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation'
    }),
    distinct: Flags.string({
      summary: 'COUNT_DISTINCT() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation'
    }),
    sum: Flags.string({
      summary: 'SUM() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation'
    }),
    min: Flags.string({
      summary: 'MIN() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation'
    }),
    max: Flags.string({
      summary: 'MAX() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation'
    }),
    avg: Flags.string({
      summary: 'AVG() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation'
    }),
    total: Flags.string({
      summary: 'Label for for grouping subtotals',
      helpGroup: 'Aggregation'
    }),
  };

  static strict = false;

  async run() {
    const { flags } = await this.parse(Query);
    const { project } = await this.getProjectContext(false);

    if (flags.output === 'json') {
      this.output = OutputLevel.silent;
    } else {
      this.output = OutputLevel.interactive;
    }

    let qb: QueryBuilder | undefined;
    let q: GeneratedAqlQuery | undefined;

    if (flags.input) {
      if (flags.input.endsWith('.aql')) {
        const aqlString = await readFile(flags.input).then(buffer => buffer.toString());
        q = aql`${literal(aqlString)}`;
      } else {
        const spec = await readFile(flags.input).then(buffer => JSON.parse(buffer.toString()));
        qb = new QueryBuilder(spec);
      }
    }

    // If there's no GeneratedAqlQuery yet, try building it from the QueryBuilder,
    // if it exists. Very speculative stuff. Also set up an empty result set.
    if (q === undefined) {
      qb = await this.buildQueryFromFlags(qb);
      q = qb?.build();
    }
    let results: JsonMap[] = [];

    // Now we start handling output; 'debug' and 'spec' mode are meant to help
    // When a query errors out, so we'll handle them without actually executing it.
    if (flags.output === 'debug') {
      await this.printDebugData(qb, q);
    } else if (flags.output === 'spec') {
      await this.printSpec(qb);
    } else {

      // Execute the query, with a spinner to keep ADHD people interested
      // if it takes more than a few miliseconds. It me.
      if (q === undefined) {
        this.ux.error(`Couldn't build query; try using --output=debug to inspect the generated query.`);
      } else {
        this.ux.action.start('Running query');
        results = await QueryBuilder.run<JsonMap>(q);
        this.ux.action.stop();
      }
  
      if (flags.output?.toLocaleLowerCase() === 'json') {
        // In JSON mode we don't do anything else, just spit JSON to the screen.
        // People can pipe it to whatever JSON tool they like.
        this.log(JSON.stringify(results));

      } else if (flags.output?.toLocaleLowerCase() === 'csv') {
        // This is just a direct-to-screen version of the '*.csv' case below.
        const csvStream = csv.format({ headers: true });
        csvStream.pipe(process.stdout);
        for (const row of results) {
          csvStream.write(row);
        }
        csvStream.end();

      } else if (flags.output?.toLocaleLowerCase() === 'raw') {
        // In 'raw' mode we output pretty-printed results to the console; it's
        // useful for inspecting large resultset with limit=1. 
        this.ux.styledJSON(results);
  
      } else if (flags.output?.toLocaleLowerCase().endsWith('.json')) {
        // If the user provides a *filename* that ends with .json, we'll
        // write it to the ./storage/output directory.
        project.files('output').write(flags.output, Buffer.from(JSON.stringify(results, undefined, 2)));
        this.ux.info(`Wrote file to ./storage/output/${flags.output}`);

      } else if (flags.output?.toLocaleLowerCase().endsWith('.xlsx')) {
        // If the user provides a *filename* that ends with .xlsx, we'll
        // generate a new Spreadsheet with the results in it, and write
        // the file as an Excel workbook to the ./storage/output directory.
        const s = new Spreadsheet();
        s.addSheet(results, 'results');
        project.files('output').write(flags.output, Buffer.from(s.toBuffer()));
        this.ux.info(`Wrote file to ./storage/output/${flags.output}`);

      } else if (flags.output?.toLocaleLowerCase().endsWith('.csv')) {
        const csvStream = csv.format({ headers: true });
        project.files('output').writeStream(flags.output, csvStream);
        for (const row of results) {
          csvStream.write(row);
        }
        csvStream.end();
        this.ux.info(`Wrote file to ./storage/output/${flags.output}`);

      } else if (flags.output === undefined) {
        // If there's no output flag specified, it's time to party.
        // 1. If it's an array of primitives (strings, numbers, etc), print the list.
        // 2. If it's an array of objects, extract their keys to use as column headers
        //    and output a CLI table.
        const columns: Record<string, Record<string, string>> = {};
        for (const o of Object.keys(results[0])) {
          _.set(columns, `${o}.header`, o);
        }
        this.ux.table(results, columns);

      } else {
        // A weird fallback case in which someone specifies an arbitrary output string
        // we don't explicitly handle. Just assume it's a filename and let it rip.
        project.files('output').write(flags.output, Buffer.from(JSON.stringify(results)));
        this.ux.info(`Wrote file to ./storage/output/${flags.output}`);
      }
    }
  }

  /**
   * Given the assorted flags that have been passed in, uses the QueryBuilder's
   * fluent methods to build out a full query spec.
   * 
   * NOTE: Due to the way flags are grouped by OCLIF, there's no way to put
   * one filter *before* the group-by commands. Thus, all filters must be
   * applied before grouping/aggregation. This makes it impossible to build, for
   * example, a query that counts the number of items in a category, but hides
   * categoies with fewer than 10 items.
   * 
   * We're working on it.
   */
  async buildQueryFromFlags(qb?: QueryBuilder) {
    const { flags } = await this.parse(Query);

    if (qb === undefined) qb = new QueryBuilder(flags.collection);

    // Filters
    for (const f of flags.filter ?? []) {
      if (f.indexOf(':') >= 0) {
        const [prop, value] = f.split(':');
        const multiValues: (string | number)[] = value.split(',').map(item => item.trim()).map(item => is.numericString(item) ? Number.parseInt(item) : item)
        if (multiValues.length > 1) {
          qb.filterBy(prop, multiValues);
        } else {
          qb.filterBy(prop, is.numericString(value) ? Number.parseInt(value) : value);
        }
      } else {
        qb.filterBy(f);
      }
    }

    // Group/Collect
    for (const r of flags.group ?? []) {
      if (r.indexOf(':') >= 0) {
        qb.groupBy(r.split(':')[0], r.split(':')[1]);
      } else {
        qb.groupBy(r);
      }
    }

    // Aggregates
    const averageFuncs = ['distinct', 'empty', 'nonempty', 'sum', 'avg', 'min', 'max'] as const;
    for (const fnc of averageFuncs) {
      for (const r of flags[fnc] ?? []) {
        if (r.indexOf(':') >= 0) {
          qb.aggregate(r.split(':')[0], fnc, r.split(':')[1]);
        } else {
          qb.aggregate(r, fnc);
        }
      }
    }

    // Return properties
    for (const r of flags.return ?? []) {
      if (r.indexOf(':') >= 0) {
        qb.return(r.split(':')[0], r.split(':')[1]);
      } else {
        qb.return(r);
      }
    }
  
    // Post-collect filters
    for (const f of flags.returnFilter ?? []) {
      if (f.indexOf(':') >= 0) {
        const [prop, value] = f.split(':');
        const multiValues: (string | number)[] = value.split(',').map(item => item.trim()).map(item => is.numericString(item) ? Number.parseInt(item) : item)
        if (multiValues.length > 1) {
          qb.filterBy(prop, multiValues);
        } else {
          qb.filterBy(prop, is.numericString(value) ? Number.parseInt(value) : value);
        }
      } else {
        qb.filterBy(f);
      }
    }

    // Sort
    for (const s of flags.sort ?? []) {
      const [prop, direction] = s.split(':');
      if (direction === 'asc' || direction === 'desc') {
        qb.sortBy(prop, direction);
      } else {
        qb.sortBy(prop);
      }
    }

    qb.limit(flags.limit);

    return Promise.resolve(qb);
  }

  async printSpec(qb?: QueryBuilder) {
    this.ux.styledJSON(qb?.spec);
    return Promise.resolve();
  }

  async printDebugData(qb?: QueryBuilder, q?: GeneratedAqlQuery) {
    if (qb) {
      this.ux.info('');
      this.ux.styledHeader('Query spec');
      this.ux.styledJSON(qb.spec);
    }

    if (q) {
      this.ux.info('');
      this.ux.styledHeader('Raw query');
      this.ux.info(q.query);

      if (Object.entries(q.bindVars).length) {
        this.ux.info('');
        this.ux.styledHeader('Bound variables');
        this.ux.styledObject(q.bindVars);
      }
    }
    return Promise.resolve();
  }
}
