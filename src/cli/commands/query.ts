import { SgCommand } from '../index.js';
import { Flags, Args } from '@oclif/core';
import {
  OutputLevel,
  Spidergram,
  AqFilter,
  Query,
  isAqlFunction,
  isAqlAggregateFunction,
  FileTools,
  isAqQuery,
} from '../../index.js';
import { JsonMap, JsonPrimitive } from '@salesforce/ts-types';
import _ from 'lodash';
import { readFile } from 'fs/promises';
import {
  aql,
  literal,
  GeneratedAqlQuery,
  isGeneratedAqlQuery,
} from 'arangojs/aql.js';
import * as csv from 'fast-csv';
import arrify from 'arrify';
import { inspectValue } from '../../index.js';

export default class RunQuery extends SgCommand {
  static strict = false;

  static summary = 'Run a query against the crawl data';

  static usage =
    '<%= command.id %> [query name>] [--input <value> | --aql <value> | --collection=<value>] ...';

  static args = {
    query: Args.string({
      description: 'A named query from the project configuration.',
      required: false
    }),
  };

  static flags = {
    list: Flags.boolean({
      summary: 'List the available stored queries',
    }),
    // Basic query information
    input: Flags.string({
      char: 'i',
      summary: 'A JSON file containing a query description',
      exclusive: ['aql'],
    }),
    output: Flags.string({
      char: 'o',
      summary: 'Output format or filename',
      description: `table: (Default) Displays a formatted table of results
debug: Display the query spec and generated AQL statement without running it
*.csv: Save the results as a CSV file in the storage directory
*.json: Save the results as a JSON file in the storage directory.
*.xlsx: Save the results as an Excel workbook in the storage directory`,
    }),

    aql: Flags.string({
      char: 'a',
      summary: 'A file containing a raw AQL query',
      exclusive: ['input'],
    }),

    collection: Flags.string({
      char: 'c',
      exclusive: ['aql'],
      summary: 'The Arango collection to be queried',
      helpGroup: 'Query',
    }),
    filter: Flags.string({
      char: 'f',
      exclusive: ['aql'],
      summary: 'Filter records by a property',
      description: `"path" returns records where the property IS NOT null
"path = value} returns records where property equals value
"path != value" returns records where property DOES NOT equal value
"path > value" returns records where property is greater than value
"path < value" returns records where property is less than value
"path { value,value" returns records where values contain property
"path } value" returns records where value is contained in property`,
      multiple: true,
      helpGroup: 'Query',
    }),
    return: Flags.string({
      char: 'r',
      exclusive: ['aql'],
      summary: 'Properties to include in the return value',
      multiple: true,
      helpGroup: 'Query',
    }),
    postFilter: Flags.string({
      char: 'p',
      exclusive: ['aql'],
      summary: 'Filter post-aggregation results by a property',
      multiple: true,
      helpGroup: 'Query',
    }),
    sort: Flags.string({
      char: 's',
      exclusive: ['aql'],
      summary: 'Sort results by a property',
      multiple: true,
      helpGroup: 'Query',
    }),
    limit: Flags.integer({
      char: 'l',
      exclusive: ['aql'],
      summary: 'The maximum number of results to display',
      default: 40,
      helpGroup: 'Query',
    }),

    // Collect/aggregate
    group: Flags.string({
      char: 'g',
      aliases: ['collect'],
      exclusive: ['aql'],
      summary: 'Group the results by a property',
      multiple: true,
      helpGroup: 'Aggregation',
    }),
    empty: Flags.string({
      exclusive: ['aql'],
      summary: 'COUNT_EMPTY() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation',
    }),
    nonempty: Flags.string({
      exclusive: ['aql'],
      summary: 'COUNT_EMPTY() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation',
    }),
    distinct: Flags.string({
      exclusive: ['aql'],
      summary: 'COUNT_DISTINCT() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation',
    }),
    sum: Flags.string({
      exclusive: ['aql'],
      summary: 'SUM() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation',
    }),
    min: Flags.string({
      exclusive: ['aql'],
      summary: 'MIN() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation',
    }),
    max: Flags.string({
      exclusive: ['aql'],
      summary: 'MAX() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation',
    }),
    avg: Flags.string({
      exclusive: ['aql'],
      summary: 'AVG() a property when grouping results',
      multiple: true,
      helpGroup: 'Aggregation',
    }),
    count: Flags.string({
      exclusive: ['aql'],
      char: 'c',
      summary: 'Label for for grouping subtotals',
      default: 'total',
      helpGroup: 'Aggregation',
    }),
  };

  async run() {
    const { flags, args } = await this.parse(RunQuery);
    const sg = await Spidergram.load();

    if (flags.list) {
      const storedQueries = sg.config.queries;
      if (
        storedQueries === undefined ||
        Object.keys(storedQueries).length === 0
      ) {
        this.ux.info(
          `No queries are currently defined in the Spidergram configuration.`,
        );
        this.exit();
      } else {
        const data: Record<string, unknown>[] = Object.entries(
          storedQueries,
        ).map(([name, query]) => {
          if (typeof query === 'string') return { query: name, type: 'Raw' };
          if (isGeneratedAqlQuery(query)) return { query: name, type: 'AQL' };
          if (isAqQuery(query))
            return {
              query: name,
              category: query.metadata?.category,
              description: query.metadata?.description ?? query.comment,
              type: 'Spec',
            };
          if (query instanceof Query)
            return {
              query: name,
              category: query.spec.metadata?.category,
              description: query.spec.metadata?.description ?? query.spec.comment,
              type: 'Class',
            };
          else return {};
        });
        this.ux.table(data, {
          query: { header: 'Query' },
          category: { header: 'Group' },
          description: { header: 'Description' },
          type: { header: 'Type' },
        });
        this.exit();
      }
    }

    if (flags.output === 'json') {
      this.output = OutputLevel.silent;
    } else {
      this.output = OutputLevel.interactive;
    }

    // Set up the placeholder values and generated queries
    let qb: Query | undefined;
    let q: GeneratedAqlQuery | undefined;
    let results: JsonMap[] = [];

    if (args.query) {
      // We got the name of a preset. Party time!
      const preset = sg.config.queries?.[args.query];
      if (typeof preset === 'string') {
        q = aql`${literal(preset)}`;
      } else if (isAqQuery(preset)) {
        qb = await this.buildQueryFromFlags(new Query(preset));
        q = qb.build();
      } else if (preset instanceof Query) {
        qb = await this.buildQueryFromFlags(preset);
        q = qb.build();
      } else if (isGeneratedAqlQuery(preset)) {
        q = preset;
      }
    } else if (flags.aql) {
      // If we received a raw AQL file, we'll skip the majority of our builder code and
      // go straight to display.
      const aqlString = await readFile(flags.aql).then(buffer =>
        buffer.toString(),
      );
      q = aql`${literal(aqlString)}`;
    } else if (flags.input) {
      // If a custom spec was passed in, load it and then process the rest of the flags.
      const spec = await readFile(flags.input).then(buffer =>
        JSON.parse(buffer.toString()),
      );
      qb = await this.buildQueryFromFlags(new Query(spec));
      q = qb.build();
    } else {
      // Aaaand finally, if no other inputs were specified just do the usual processing.
      qb = await this.buildQueryFromFlags();
      q = qb.build();
    }

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
        this.ux.error(
          `Couldn't build query; try using --output=debug to inspect the generated query.`,
        );
      } else {
        this.ux.action.start('Running query');
        results = await Query.run<JsonMap>(q);
        this.ux.action.stop();
      }

      if (flags.output?.toLocaleLowerCase() === 'inspect') {
        // In 'inspect' mode we output a pretty-printed version of the first item.
        this.log(inspectValue(results[0]));
      } else if (flags.output?.toLocaleLowerCase() === 'raw') {
        // In 'raw' mode we output pretty-printed results to the console; it's
        // useful for inspecting large resultset with limit=1.
        this.ux.styledJSON(results);
      } else if (flags.output?.toLocaleLowerCase() === 'json') {
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
      } else if (flags.output?.toLocaleLowerCase().endsWith('.json')) {
        // If the user provides a *filename* that ends with .json, we'll
        // write it to the global storage directory.
        sg.files().write(
          flags.output,
          Buffer.from(JSON.stringify(results, undefined, 2)),
        );
        this.ux.info(
          `Wrote file to ${sg.config.storageDirectory}/${flags.output}`,
        );
      } else if (flags.output?.toLocaleLowerCase().endsWith('.xlsx')) {
        // If the user provides a *filename* that ends with .xlsx, we'll
        // generate a new Spreadsheet with the results in it, and write
        // the file as an Excel workbook to the ${sg.config.storageDirectory} directory.
        const s = new FileTools.Spreadsheet();
        s.addSheet(results, 'results');
        sg.files().write(flags.output, Buffer.from(s.toBuffer()));
        this.ux.info(
          `Wrote file to ${sg.config.storageDirectory}/${flags.output}`,
        );
      } else if (flags.output?.toLocaleLowerCase().endsWith('.csv')) {
        const csvStream = csv.format({ headers: true });
        sg.files().writeStream(flags.output, csvStream);
        for (const row of results) {
          csvStream.write(row);
        }
        csvStream.end();
        this.ux.info(
          `Wrote file to ${sg.config.storageDirectory}/${flags.output}`,
        );
      } else if (flags.output === undefined) {
        // If there's no output flag specified, it's time to party.
        // 1. If it's an array of primitives (strings, numbers, etc), print the list.
        // 2. If it's an array of objects, extract their keys to use as column headers
        //    and output a CLI table.

        if (results.length === 0) {
          this.ux.info('No matching results.');
        } else if (
          ['string', 'number', 'boolean', 'null'].includes(typeof results[0])
        ) {
          // 1. If it's an array of primitives (strings, numbers, etc), print the list.
          this.ux.table(
            results.map(item => {
              return { value: item };
            }),
            { value: { header: 'Results' } },
          );
        } else if ('_rev' in results[0]) {
          // 2. If it looks like an array of raw documents, just print their IDs
          this.ux.table(
            results.map(item => {
              return {
                collection: (item._id as string).split('/')[0],
                id: (item._id as string).split('/')[1],
              };
            }),
            { collection: { header: 'Collection' }, id: { header: 'ID' } },
          );
        } else {
          // 3. If it's an array of objects, extract their keys to use as column headers and output a CLI table.
          const columns: Record<string, Record<string, string>> = {};
          for (const o of Object.keys(results[0])) {
            _.set(columns, `${o}.header`, o);
          }
          this.ux.table(results, columns);
        }
      } else {
        // A weird fallback case in which someone specifies an arbitrary output string
        // we don't explicitly handle. Just assume it's a filename and let it rip.
        sg.files().write(flags.output, Buffer.from(JSON.stringify(results)));
        this.ux.info(
          `Wrote file to ${sg.config.storageDirectory}/${flags.output}`,
        );
      }
    }
  }

  /**
   * Given the assorted flags that have been passed in, uses the Query's
   * fluent methods to build out a full query spec.
   */
  async buildQueryFromFlags(qb?: Query) {
    const { flags } = await this.parse(RunQuery);

    if (qb === undefined) qb = new Query(flags.collection ?? 'resources');

    // Filters
    for (const f of flags.filter ?? []) {
      qb.filterBy(buildFilter(f));
    }

    // Group/Collect
    for (const r of flags.group ?? []) {
      if (r.indexOf('=') >= 0) {
        qb.groupBy(r.split('=')[0], r.split('=')[1]);
      } else {
        qb.groupBy(r);
      }
    }

    // Aggregates
    const aggregateFuncs = ['distinct', 'sum', 'avg', 'min', 'max'];
    for (const fnc of aggregateFuncs) {
      for (const a of flags[fnc] ?? []) {
        const [name, path] = a.split('=');
        if (isAqlAggregateFunction(fnc)) {
          qb.aggregate({ name, path, function: fnc });
        }
      }
    }

    // Return properties
    for (const r of flags.return ?? []) {
      if (r.indexOf('=') >= 0) {
        const [name, path] = r.split('=');
        qb.return({ name, ...unwrapPathFunction(path) });
      } else {
        qb.return({ ...unwrapPathFunction(r) });
      }
    }

    // Post-collect filters
    for (const f of flags.postFilter ?? []) {
      qb.filterBy(buildFilter(f));
    }

    // Sort
    for (const s of flags.sort ?? []) {
      const [prop, direction] = s.split('=');
      if (direction === 'asc' || direction === 'desc') {
        qb.sortBy(prop, direction);
      } else {
        qb.sortBy(prop);
      }
    }

    if (flags.count?.toLocaleLowerCase() === 'false') {
      qb.count(false);
    } else {
      qb.count(flags.count);
    }

    qb.limit(flags.limit);

    return Promise.resolve(qb);
  }

  async printSpec(qb?: Query) {
    this.ux.styledJSON(qb?.spec);
    return Promise.resolve();
  }

  async printDebugData(qb?: Query, q?: GeneratedAqlQuery) {
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

function buildFilter(input: string): AqFilter {
  let filterSpec: AqFilter;

  if (input.indexOf('!=') >= 0) {
    // property must not equal
    const [prop, value] = input.split('!=');
    const cv = coerceValue(value);
    filterSpec = { ...unwrapPathFunction(prop), negate: true, eq: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else if (input.indexOf('=') >= 0 || input.indexOf('==') >= 0) {
    // property must equal
    const [prop, value] = input.split(/=+/);
    const cv = coerceValue(value);
    filterSpec = { ...unwrapPathFunction(prop), eq: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else if (input.indexOf('>') >= 0) {
    // property must be greater than value
    const [prop, value] = input.split('>');
    const cv = coerceValue(value) ?? undefined;
    filterSpec = { ...unwrapPathFunction(prop), gt: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else if (input.indexOf('<') >= 0) {
    // property must be less than value
    const [prop, value] = input.split('<');
    const cv = coerceValue(value) ?? undefined;
    filterSpec = { ...unwrapPathFunction(prop), lt: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else if (input.indexOf('{') >= 0) {
    // property must be contained in a list of values
    const [prop, value] = input.split('{');
    filterSpec = {
      ...unwrapPathFunction(prop),
      in: arrify(splitMultiValues(value)),
    };
    if (typeof (filterSpec.in ?? [])[0] === 'string')
      filterSpec.type = 'string';
  } else if (input.indexOf('}') >= 0) {
    // value must be contained in property, which is a list
    const [prop, value] = input.split('}');
    const cv = coerceValue(value);
    filterSpec = { ...unwrapPathFunction(prop), contains: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else {
    // No equality/comparison operator or explicit value. We'll treat
    // it as a 'not null'
    filterSpec = { ...unwrapPathFunction(input), eq: null, negate: true };
  }

  return filterSpec;
}

function splitMultiValues(value: string) {
  const multiValues: JsonPrimitive[] = value
    .split(',')
    .map(item => item.trim())
    .map(item => coerceValue(item));
  if (multiValues.length === 0) return multiValues[0];
  else return multiValues;
}

function coerceValue(value: string) {
  const numValue = Number.parseInt(value);
  if (!Number.isNaN(numValue)) return numValue;
  else if (value.toLocaleLowerCase() === 'null') return null;
  else return value;
}

function unwrapPathFunction(input: string, aggregate = true) {
  const [patternMatch, func, path] =
    input.match(/([a-zA-Z0-0_]+)\((.*)\)/) ?? [];
  if (patternMatch) {
    if (aggregate && isAqlAggregateFunction(func)) {
      return { path, function: func };
    } else if (!aggregate && isAqlFunction(func)) {
      return { path, function: func };
    }
  }

  return { path: input };
}
