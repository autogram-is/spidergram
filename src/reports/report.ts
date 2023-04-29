import { Query, JobStatus, Spidergram, AqFilter } from '../index.js';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import {
  AnyJson,
  isAnyJson,
  isJsonArray,
  isJsonMap,
} from '@salesforce/ts-types';
import { DateTime } from 'luxon';
import { ReportConfig } from './report-types.js';
import { buildQueryWithParents } from '../model/queries/query-inheritance.js';

import { outputCsvReport } from './output-csv.js';
import { outputJsonReport } from './output-json.js';
import { outputXlsxReport } from './output-xlsx.js';

import is from '@sindresorhus/is';
import _ from 'lodash';

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

export class ReportRunner {
  protected events: AsyncEventEmitter<ReportEventMap>;

  config: ReportConfig;
  status: ReportStatus;

  constructor(config: ReportConfig = {}) {
    this.events = new AsyncEventEmitter<ReportEventMap>();
    this.config = { ...config };

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

  async build(
    customConfig?: ReportConfig,
    filters: AqFilter[] = [],
  ): Promise<void> {
    const config = customConfig ?? this.config;
    // Give custom builder functions a chance to alter the queries,
    // populate custom data, or, you know, whatevs.
    if (is.function_(config.alterQueries)) {
      await config.alterQueries(config, this);
    }

    this.status.total += Object.keys(config.queries ?? {}).length;

    // Iterate over every query, modify it if necessary, and run it.
    for (const [name, query] of Object.entries(config.queries ?? {})) {
      const q = await buildQueryWithParents(query);
      if (q === undefined) continue;

      if (q instanceof Query) {
        for (const filter of filters) {
          q.filterBy(filter);
        }
      }

      this.events.emit('progress', this.status, `Running ${name} query`);
      config.data ??= {};
      config.data[name] = await Query.run<AnyJson>(q);
      this.status.finished++;
    }
    this.events.emit('progress', this.status, 'Data retrieved');
  }

  async transform(customConfig?: ReportConfig): Promise<void> {
    // Alter the final data. If there's a custom function, hand off.
    // If there are settings, do the thing here.
    const config = customConfig ?? this.config;
    config.data ??= {};
    config.settings ??= {};
    config.settings.sheets ??= {};

    if (is.function_(config.alterData)) {
      await config.alterData(config, this);
    } else if (config.alterData) {
      for (const [key, data] of Object.entries(config.data)) {
        const op = config.alterData[key] ?? config.alterData['default'];
        if (op) {
          if (op.action === 'split' && isJsonArray(data)) {
            const groups = _.groupBy(data, row => {
              let group = key;
              if (isAnyJson(row) && isJsonMap(row)) {
                const datumValue = row[op.property];
                if (op.mustMatch) {
                  if (
                    (is.string(datumValue) || is.number(datumValue)) &&
                    op.mustMatch.includes(datumValue)
                  )
                    group = datumValue.toString();
                } else if (datumValue !== undefined && datumValue !== null) {
                  group = datumValue.toString();
                }
              }
              return group;
            });
            for (const [k, v] of Object.entries(groups)) {
              config.data[k] = v;
            }
          }
        }
      }
    }
    this.status.finished++;
  }

  async output(customConfig?: ReportConfig): Promise<void> {
    const config = customConfig ?? this.config;

    this.events.emit('progress', this.status, 'Generating files');
    config.settings ??= {};

    // Supply defaults and do token-replacement on the output path
    let loc = (config?.settings?.path as string) ?? '{{date}} {{name}}';
    loc = loc.replace('{{name}}', config.name ?? 'report');
    loc = loc.replace('{{date}}', DateTime.now().toISODate() ?? '');
    config.settings.path = loc;

    if (is.function_(config.output)) {
      await config.output(config, this);
    } else if (
      config.settings?.type === 'csv' ||
      config.settings?.type === 'tsv'
    ) {
      await outputCsvReport(config, this);
    } else if (
      this.config.settings?.type === 'json' ||
      config.settings?.type === 'json5'
    ) {
      await outputJsonReport(config, this);
    } else {
      // Default to XLSX?
      await outputXlsxReport(config, this);
    }

    this.status.finished++;
    this.events.emit('progress', this.status, 'Report complete');
    return Promise.resolve();
  }

  async run(filters: AqFilter[] = []): Promise<ReportStatus> {
    await Spidergram.load();

    this.status.startTime = Date.now();
    this.status.total = 2;

    if (this.config.repeat) {
      for (const [variation, vf] of Object.entries(this.config.repeat ?? {})) {
        const vc: ReportConfig = _.cloneDeep(this.config);
        vc.name = variation;
        await this._runReport(vc, [...(is.array(vf) ? vf : [vf]), ...filters]);
      }
    } else {
      await this._runReport(this.config, filters);
    }

    this.status.finishTime = Date.now();
    this.events.emit('end', this.status);
    return Promise.resolve(this.status);
  }

  async _runReport(
    config: ReportConfig,
    filters: AqFilter[] = [],
  ): Promise<void> {
    await Spidergram.load();
    return this.build(config, filters)
      .then(() => this.transform(config))
      .then(() => this.output(config));
  }
}
