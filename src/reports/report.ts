import {
  GeneratedAqlQuery,
  aql,
  isGeneratedAqlQuery,
  literal,
} from 'arangojs/aql.js';
import {
  AqQuery,
  isAqQuery,
  isAqFilter,
  isAqAggregate,
  isAqProperty,
  isAqSort,
} from 'aql-builder';
import { Query, JobStatus, Spidergram } from '../index.js';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import {
  AnyJson,
  JsonCollection,
  isJsonArray,
  isJsonMap,
} from '@salesforce/ts-types';
import { FileTools } from '../index.js';
import { write as writeCsv } from '@fast-csv/format';
import _ from 'lodash';
import path from 'node:path';
import { DateTime } from 'luxon';
import is from '@sindresorhus/is';

/**
 * A query definition with additional filters, return values, or limits.
 * This allows a report to reuse a pre-existing query with minor alterations.
 */
export type ModifiedQuery = {
  /**
   * The core query to use as a starting point. If this value is a string,
   * it will be treated as the name of a saved query to look up in the global
   * configuration.
   */
  base: string | AqQuery | Query;

  /**
   * Any parts of an AqQuery structure; this includes filters, aggregates,
   * return values, limits, sorts, and so on. These elements will be merged
   * into the base query before it's executed.
   */
  modifications?: (Partial<AqQuery> | Query) | (Partial<AqQuery> | Query)[];

  /**
   * Separate and group the results based on the values in of the result set's
   * properties. Treat each of the resulting groups as a separate result set in
   * the final export.
   *
   * If this property is set to a string, it is assumed to be the property name
   * to group by. If it's an object, it's assumed to be the property name and a
   * a list of values to separate; all others will be left as part of the default
   * result set for the query.
   */
  split?: string | { property: string; values: (string | number)[] };

  /**
   * An optional post-processing function for the query data. This can be used
   * to transform nested values into spreadsheet-friendly ones, or transform
   * unformatted values into readable ones.
   */
  postProcess?: (data: AnyJson[]) => AnyJson[];
};

/**
 * Configuration options for a {@link Report}
 */
export interface ReportConfig {
  /**
   * A readable, user-facing name for the report.
   *
   * @defaultValue `report`
   */
  name?: string;

  /**
   * A human-friendly description of the Report and its purpose. This will
   * be displayed on the command line and in other locations where Spidergram
   * users can choose from available reporting options.
   */
  description?: string;

  /**
   * An optional grouping or category for the report, when displayed in user-facing
   * lists and status displays.
   */
  category?: string;

  /**
   * The path where the final report will be saved. `outputPath` supports the following
   * placeholder tokens:
   *
   * - `{{name}}`: The name of the report
   * - `{{date}}`: The current date in YYYY-MM-DD format
   *
   * In addition, any values used the `options` property of the Report configuration
   * can be used as tokens. The file extension (.json, .xlsx, etc) will be appended
   * automatically.
   *
   * @defaultValue `{{name}} - {{date}}`
   */
  outputPath?: string;

  /**
   * A dictionary of report-specific options whose values can be changed each time
   * the report is run. For examp.
   */
  options?: Record<string, unknown>;

  /**
   * A named collection of queries that should be run to build the report's data
   */
  queries?: Record<
    string,
    string | GeneratedAqlQuery | AqQuery | Query | ModifiedQuery
  >;

  /**
   * One or more partial {@link AqQuery} structures or full Query objects;
   * the filters, aggregates, return values, limits, sorts, and so on from these
   * partial queries will be applied to all queries in the report (unless they're
   * hard-coded AQL).
   */
  modifications?: (Partial<AqQuery> | Query) | (Partial<AqQuery> | Query)[];

  /**
   * If a query returns no results, omit it from the report.
   */
  dropEmptyQueries?: boolean;

  /**
   * If a query returns a single row, pivot the data to turn its columns into rows.
   */
  pivotSingleResults?: boolean;
}

interface ReportStatus extends JobStatus {
  records: Record<string, number>;
  files: string[];
}

type ReportEventMap = Record<PropertyKey, unknown[]> & {
  progress: [status: ReportStatus, message?: string];
  failure: [status: ReportStatus, error?: Error, message?: string];
  end: [status: ReportStatus];
};

type ReportEventType = keyof ReportEventMap;
type ReportEventParams<T extends ReportEventType> = ReportEventMap[T];
type ReportEventListener<T extends ReportEventType> = (
  ...args: ReportEventParams<T>
) => unknown;

export class Report implements ReportConfig {
  queries: Record<
    string,
    string | GeneratedAqlQuery | AqQuery | Query | ModifiedQuery
  >;
  data: Record<string, AnyJson[]> = {};

  name?: string;
  description?: string;
  category?: string;
  options?: Record<string, unknown>;
  pivotSingleResults: boolean;
  dropEmptyQueries: boolean;
  modifications: Partial<AqQuery>[];
  outputPath: string;

  status: ReportStatus;
  protected events: AsyncEventEmitter<ReportEventMap>;

  constructor(protected config: ReportConfig = {}) {
    this.events = new AsyncEventEmitter<ReportEventMap>();

    // Set internal options
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.options = config.options ?? { format: 'xslx' };
    this.outputPath = config.outputPath ?? '{{date}} {{name}}';
    if (config.modifications) {
      const mods = Array.isArray(config.modifications)
        ? config.modifications
        : [config.modifications];
      this.modifications = mods.map(m => (m instanceof Query ? m.spec : m));
    } else {
      this.modifications = [];
    }
    this.pivotSingleResults = !!config.pivotSingleResults;
    this.dropEmptyQueries = !!config.dropEmptyQueries;

    this.queries = config.queries ?? {};

    // Set up status
    this.status = {
      total: 0,
      failed: 0,
      finished: 0,
      startTime: 0,
      finishTime: 0,
      files: [],
      records: {},
    };
  }

  on<T extends ReportEventType>(
    event: T,
    listener: ReportEventListener<T>,
  ): this {
    this.events.on<T>(event, listener);
    return this;
  }

  off<T extends ReportEventType>(
    event: T,
    listener: ReportEventListener<T>,
  ): this {
    if (listener) {
      this.events.removeListener<ReportEventType>(event, listener);
      return this;
    } else {
      this.events.removeAllListeners<ReportEventType>(event);
      return this;
    }
  }

  async build(): Promise<void> {
    // Iterate over every query, modify it if necessary, and run it.
    for (const [name, query] of Object.entries(this.queries)) {
      this.events.emit('progress', this.status, name);

      let rawData: AnyJson[] = [];

      const q = await getReportQuery(query);
      if (q === undefined) continue;

      if (isGeneratedAqlQuery(q)) {
        rawData = await Query.run(q);
      } else {
        // Set up the modifications list
        const modifications = [...this.modifications];
        if (isModifiedQuery(query)) {
          if (query.modifications !== undefined) {
            query.modifications = Array.isArray(query.modifications)
              ? query.modifications
              : [query.modifications];
            query.modifications ??= [];
            modifications.push(
              ...query.modifications.map(m =>
                m instanceof Query ? m.spec : m,
              ),
            );
          }
        }

        // Alter query — this is also where user values might be injected.
        for (const mod of modifications) {
          // Make an effort to weed out modifications that don't match
          if (
            mod.collection &&
            mod.collection?.toString() !== q.spec.collection.toString()
          ) {
            continue;
          }

          for (const f of mod.filters ?? []) {
            if (isAqFilter(f)) q.filterBy(f);
            else if (typeof f === 'string') q.filterBy(f);
          }
          for (const a of mod.aggregates ?? []) {
            if (isAqAggregate(a)) q.aggregate(a);
            else if (typeof a === 'string') q.aggregate(a);
          }
          for (const s of mod.sorts ?? []) {
            if (typeof s === 'string' || isAqSort(s)) q.return(s);
          }
          if (mod.limit) q.limit(mod.limit);
          for (const r of mod.return ?? []) {
            if (typeof r === 'string' || isAqProperty(r)) q.return(r);
          }
        }
        rawData = await q.run();
      }

      if (isModifiedQuery(query)) {
        if (query.postProcess) {
          rawData = query.postProcess(rawData);
        }

        if (query.split) {
          const propName =
            typeof query.split === 'string'
              ? query.split
              : query.split.property;
          const allowedValues =
            typeof query.split === 'string' ? undefined : query.split.values;

          const groups = _.groupBy(rawData, datum => {
            let group = name;
            if (isJsonMap(datum)) {
              const datumValue = datum[propName];
              if (allowedValues) {
                if (
                  (is.string(datumValue) || is.number(datumValue)) &&
                  allowedValues.includes(datumValue)
                )
                  group = datumValue.toString();
              } else if (datumValue !== undefined && datumValue !== null) {
                group = datumValue.toString();
              }
            }
            return group;
          });
          for (const [k, v] of Object.entries(groups)) {
            this.data[k] = v;
            this.status.records[k] = this.data[k].length;
          }
        }
      } else {
        this.data[name] = rawData;
        this.status.records[name] = this.data[name].length;
      }
    }

    if (this.pivotSingleResults === true) {
      for (const k in this.data) {
        if (this.data[k].length === 1) this.data[k] = pivot(this.data[k]);
      }
    }

    this.status.finished++;
    this.events.emit('progress', this.status, 'Data retrieved');
  }

  async generate(): Promise<void> {
    const sg = await Spidergram.load();
    this.events.emit('progress', this.status, 'Generating files');

    const opt = _.get(this.options, 'format');
    const format = typeof opt === 'string' ? opt : 'xlsx';
    const rpt = new FileTools.Spreadsheet();

    let loc = this.outputPath;
    loc = loc.replace('{{name}}', this.name ?? 'report');
    loc = loc.replace('{{date}}', DateTime.now().toISODate());

    if (format === 'json') {
      if (!(await sg.files('output').exists(loc))) {
        await sg.files('output').createDirectory(loc);
      }
      for (const [name, data] of Object.entries(this.data)) {
        if (data.length === 0 && this.dropEmptyQueries) continue;
        const curFilePath = path.join(loc, `${name}.${format}`);
        await sg
          .files('output')
          .write(curFilePath, Buffer.from(JSON.stringify(data)));

        this.status.finished++;
        this.status.files.push(curFilePath);
      }
    } else if (format === 'csv' || format === 'tsv') {
      if (!(await sg.files('output').exists(loc))) {
        await sg.files('output').createDirectory(loc);
      }
      for (const [name, data] of Object.entries(this.data)) {
        if (data.length === 0 && this.dropEmptyQueries) continue;
        if (isJsonArray(data[0]) || isJsonMap(data[0])) {
          const rows = data as JsonCollection[];
          const curFilePath = path.join(loc, `${name}.${format}`);
          const stream = writeCsv(rows, {
            delimiter: format === 'tsv' ? '\t' : undefined,
          });
          await sg.files('output').writeStream(curFilePath, stream);

          this.status.finished++;
          this.status.files.push(curFilePath);
        }
      }
    } else {
      for (const [name, data] of Object.entries(this.data)) {
        if (data.length === 0 && this.dropEmptyQueries) continue;
        rpt.addSheet(data, name.slice(0, 31));
      }
      const curFilePath = `${loc}.xlsx`;
      return sg
        .files('output')
        .write(curFilePath, rpt.toBuffer())
        .then(() => {
          this.status.finished++;
          this.status.files.push(curFilePath);
        });
    }
  }

  async run(): Promise<ReportStatus> {
    this.status.startTime = Date.now();

    // Calculate rough progress
    this.status.total = 2 + Object.keys(this.queries).length;

    return this.build()
      .then(() => this.generate())
      .then(() => {
        this.status.finishTime = Date.now();
        this.events.emit('end', this.status);
        return this.status;
      });
  }
}

function isModifiedQuery(input: unknown): input is ModifiedQuery {
  if (input) {
    if (typeof input !== 'object') return false;
    if ('base' in input) {
      if (
        isAqQuery(input.base) ||
        input.base instanceof Query ||
        typeof input.base === 'string'
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Given the various forms in which we take query definitions, take one and return either a Query
 * or a GeneratedAqlQuery object.
 */
async function getReportQuery(
  input: string | GeneratedAqlQuery | AqQuery | Query | ModifiedQuery,
): Promise<Query | GeneratedAqlQuery | undefined> {
  if (typeof input === 'string') {
    const sg = await Spidergram.load();
    const query = sg.config.queries?.[input];
    if (query) {
      return getReportQuery(query);
    } else {
      return Promise.resolve(aql`${literal(input)}`);
    }
  } else if (isGeneratedAqlQuery(input)) {
    return Promise.resolve(input);
  } else if (isAqQuery(input)) {
    return Promise.resolve(new Query(input));
  } else if (input instanceof Query) {
    return Promise.resolve(input);
  } else if (isModifiedQuery(input)) {
    return getReportQuery(input.base);
  } else {
    return Promise.resolve(undefined);
  }
}

function pivot(data: AnyJson[]) {
  const datum = data[0];
  if (isJsonMap(datum)) {
    const newData: AnyJson[][] = [];
    for (const [k, v] of Object.entries(datum)) {
      if (isJsonArray(v)) {
        newData.push([k, v.join(', ')]);
      } else {
        newData.push([k, v ?? '']);
      }
    }
    return newData;
  }
  if (isJsonArray(datum)) {
    const newData: AnyJson[] = [];
    for (const v of datum) {
      if (isJsonArray(v) || isJsonMap(v)) {
        newData.push(v);
      } else {
        newData.push([v]);
      }
    }
    return newData;
  } else {
    return data;
  }
}
