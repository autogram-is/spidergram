import { OutputLevel } from '../../index.js';
import { SgCommand } from '../index.js';
import { Flags } from '@oclif/core';
import { Query as QueryBuilder } from '../../reports/index.js'
import { Spreadsheet } from '../../index.js';
import { JsonMap } from '@salesforce/ts-types';
import _ from 'lodash';
import { readFile } from 'fs/promises';

export default class Query extends SgCommand {
  static summary = 'Query the Spidergram crawl data';

  static flags = {
    // Basic query information
    input: Flags.string({
      char: 'i',
      summary: 'A JSON file containing an Arango query spec',
    }),
    output: Flags.string({
      char: 'o',
      summary: 'Output filename',
    }),
    collection: Flags.string({
      char: 'c',
      summary: 'The Arango collection to be queried',
      default: 'resources',
      exclusive: ['input']
    }),
    return: Flags.string({
      char: 'r',
      summary: 'Properties to include in the return value',
      multiple: true,
      exclusive: ['input']
    }),
    limit: Flags.integer({
      summary: 'The Arango collection to be queried',
      default: 20,
      exclusive: ['input']
    }),

    // Filters
    empty: Flags.string({
      aliases: ['null'],
      summary: '-',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Filters'
    }),
    equals: Flags.string({
      aliases: ['eq'],
      summary: '-',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Filters'
    }),
    greater: Flags.string({
      aliases: ['gt'],
      summary: '-',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Filters'
    }),
    less: Flags.string({
      aliases: ['lt'],
      summary: '-',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Filters'
    }),
    notempty: Flags.string({
      aliases: ['exists'],
      summary: '-',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Filters'
    }),
    notequals: Flags.string({
      aliases: ['neq'],
      summary: '-',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Filters'
    }),

    // Sorting
    asc: Flags.string({
      summary: 'Sort results by a property (ascending)',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Sorting'
    }),
    desc: Flags.string({
      summary: 'Sort results by a property (descending)',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Sorting'
    }),

    // Collect/aggregate
    group: Flags.string({
      aliases: ['collect'],
      summary: 'Group the results by a property',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Aggregation'
    }),
    unique: Flags.string({
      summary: 'COUNT_UNIQUE() a property when grouping results',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Aggregation'
    }),
    sum: Flags.string({
      summary: 'SUM() a property when grouping results',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Aggregation'
    }),
    min: Flags.string({
      summary: 'MIN() a property when grouping results',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Aggregation'
    }),
    max: Flags.string({
      summary: 'MAX() a property when grouping results',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Aggregation'
    }),
    avg: Flags.string({
      summary: 'AVG() a property when grouping results',
      multiple: true,
      exclusive: ['input'],
      helpGroup: 'Aggregation'
    }),
    total: Flags.string({
      summary: 'Label for for grouping subtotals',
      helpGroup: 'Aggregation',
      exclusive: ['input']
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

    let q: QueryBuilder | undefined;

    if (flags.input) {
      const spec = await readFile(flags.input).then(buffer => JSON.parse(buffer.toString()));
      q = new QueryBuilder(spec);
    } else {
      q = new QueryBuilder(flags.collection);

      // Return properties
      for (const r of flags.return ?? []) {
        if (r.indexOf(':') >= 0) {
          q.return(r.split(':')[1], r.split(':')[0]);
        } else {
          q.return(r);
        }
      }

      // Group/Collect
      for (const r of flags.group ?? []) {
        if (r.indexOf(':') >= 0) {
          q.groupBy(r.split(':')[1], r.split(':')[0]);
        } else {
          q.groupBy(r);
        }
      }

      // Aggregates
      // TODO

      // Filters
      // TODO

      // Sort
      for (const r of flags.asc ?? []) {
        q.sortBy(r, 'asc');
      }
      for (const r of flags.desc ?? []) {
        q.sortBy(r, 'desc');
      }

      q.limit(flags.limit);
    }
    
    if (flags.output === 'debug') {
      this.ux.info('');
      this.ux.styledHeader('Query spec');
      this.ux.styledJSON(q.spec);

      this.ux.info('');
      this.ux.styledHeader('Generated query');
      this.ux.info(q.build().query);

      if (Object.entries(q.build().bindVars).length) {
        this.ux.info('');
        this.ux.styledHeader('Bound variables');
        this.ux.styledObject(q.build().bindVars);
      }
    } else if (flags.output === 'spec') {
      this.ux.styledJSON(q.spec);
    } else {
      this.ux.action.start('Running query');
      const results = await q.run<JsonMap>();
      this.ux.action.stop();

      if (flags.output?.toLocaleLowerCase() === 'json') {
        this.log(JSON.stringify(results));

      } else if (flags.output?.toLocaleLowerCase() === 'raw') {
        this.ux.styledJSON(results);
  
      } else if (flags.output?.toLocaleLowerCase().endsWith('.json')) {
        project.files('output').write(flags.output, Buffer.from(JSON.stringify(results, undefined, 2)));
        this.ux.info(`Wrote file to ./storage/output/${flags.output}`);

      } else if (flags.output?.toLocaleLowerCase().endsWith('.xlsx')) {
        const s = new Spreadsheet();
        s.addSheet(results, 'results');
        project.files('output').write(flags.output, Buffer.from(s.toBuffer()));
        this.ux.info(`Wrote file to ./storage/output/${flags.output}`);

      } else if (flags.output === undefined) {
        const columns: Record<string, Record<string, string>> = {};
        for (const o of Object.keys(results[0])) {
          _.set(columns, `${o}.header`, o);
        }
        this.ux.table(results, columns);
      } else {
        // Uhhhhhh, not sure what format people want, but we'll splat data to it and hope for the best.
        project.files('output').write(flags.output, Buffer.from(JSON.stringify(results)));
        this.ux.info(`Wrote file to ./storage/output/${flags.output}`);
      }
    }
  }
}
