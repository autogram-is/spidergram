import { Query, JobStatus, Spidergram } from '../index.js';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { AnyJson } from '@salesforce/ts-types';
import { DateTime } from 'luxon';
import { ReportConfig } from './report-types.js';
import { buildQueryWithParents } from '../model/queries/query-inheritance.js';

import { outputCsvReport } from './output-csv.js';
import { outputJsonReport } from './output-json.js';
import { outputXlsxReport } from './output-xlsx.js';

import is from '@sindresorhus/is';

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

  async build(): Promise<void> {
    // Give custom builder functions a chance to alter the queries,
    // populate custom data, or, you know, whatevs.
    if (this.config.build) {
      await this.config.build(this.config, this);
    }

    this.status.total += Object.keys(this.config.queries ?? {}).length

    // Iterate over every query, modify it if necessary, and run it.
    for (const [name, query] of Object.entries(this.config.queries ?? {})) {
      const q = await buildQueryWithParents(query);
      if (q === undefined) continue;

      this.events.emit('progress', this.status, `Running ${name} query`);
      this.config.data ??= {};
      this.config.data[name] = await Query.run<AnyJson>(q);
      this.status.finished++;
    }
    this.events.emit('progress', this.status, 'Data retrieved');
  }

  async transform(): Promise<void> {
    // Alter the final data. If there's a custom function, hand off.
    // If there are settings, do the thing here.
    this.status.finished++;
  }

  async output(): Promise<void> {
    this.events.emit('progress', this.status, 'Generating files');
    this.config.settings ??= {}

    // Supply defaults and do token-replacement on the output path
    let loc = this.config?.settings?.path as string ?? '{{date}} {{name}}';
    loc = loc.replace('{{name}}', this.config.name ?? 'report');
    loc = loc.replace('{{date}}', DateTime.now().toISODate() ?? '');
    this.config.settings.path = loc;

    if (is.function_(this.config.output)) {
      await this.config.output(this.config, this);
    } else if (this.config.settings?.type === 'csv' || this.config.settings?.type === 'tsv') {
      await outputCsvReport(this.config, this);
    } else if (this.config.settings?.type === 'json' || this.config.settings?.type === 'json5') {
      await outputJsonReport(this.config, this);
    } else if (this.config.settings?.type === 'xlsx') {
      await outputXlsxReport(this.config, this);
    } else {
      // No handler found
    }

    this.status.finished++;
    this.events.emit('progress', this.status, 'Report complete');
    return Promise.resolve();
  }

  async run(): Promise<ReportStatus> {
    await Spidergram.load();

    // Placeholder steps for data formatting and final output; 
    // we'll increase this value to account for individual queries
    // during the Build step
    this.status.startTime = Date.now();
    this.status.total = 2;

    return this.build()
      .then(() => this.build())
      .then(() => this.transform())
      .then(() => this.output())
      .then(() => {
        this.status.finishTime = Date.now();
        this.events.emit('end', this.status);
        return this.status;
      });
  }
}
