import { GeneratedAqlQuery } from "arangojs/aql";
import { AqQuery } from "aql-builder";
import { Query, JobStatus, Spidergram } from "../index.js";
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { AnyJson } from "@salesforce/ts-types";
import { FileTools } from "../index.js";

/**
 * Configuration options for a {@link Report}
 */
export interface ReportOptions {
  /**
   * A human-friendly description of the Report and its purpose. This will
   * be displayed on the command line and in other locations where Spidergram
   * users can choose from available reporting options.
   */
  description?: string;
  
  /**
   * A named collection of queries that should be run to build the report's data
   */
  queries?: Record<string, string | GeneratedAqlQuery | AqQuery | Query>;

  /**
   * An optional pre-processing function responsible for executing the queries and
   * gathering any additional data for the report.
   * 
   * By default, a report's queries are run in the sequence they appear in its 'queries'
   * collection, and results are placed in its 'data' collection.
   */
  build?: (report: this) => Promise<void>

  /**
   * An optional post-processing function to be executed after the report's queries
   * are run. It may add additional data sets, modify the data from the report's own
   * queries, and so on.
   * 
   * By default, no operations are performend in this phase.
   */
  process?: (report: this) => Promise<void>

  /**
   * An optional processing function responsible for outputting the final representation
   * of the report.
   */
  generate?: (report: this) => Promise<void>
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

export class Report implements ReportOptions {
  queries: Record<string, string | GeneratedAqlQuery | AqQuery | Query>;
  data: Record<string, AnyJson[]> = {};
  description?: string

  protected _buildFn?: (report: this) => Promise<void>;
  protected _processFn?: (report: this) => Promise<void>;
  protected _generateFn?: (report: this) => Promise<void>;

  status: ReportStatus;
  protected events: AsyncEventEmitter<ReportEventMap>;

  /**
   * Returns a new {@link AqBuilder} containing a buildable {@link AqStrict}.
   */
  constructor(protected options: ReportOptions) {
    this.events = new AsyncEventEmitter<ReportEventMap>();

    // Set internal options
    this.description = options.description;
    this._buildFn = options.build;
    this._generateFn = options.generate;
    this._processFn = options.process;
    this.queries = options.queries ?? {};
    
    // Set up status
    this.status = {
      total: 0,
      failed: 0,
      finished: 0,
      startTime: 0,
      finishTime: 0,
      files: [],
      records: {},
    }
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
    if (this._buildFn) {
      return this._buildFn(this)
        .then(() => {
          this.events.emit('progress', this.status, 'Data retrieved');
        });
    } else {
      for (const [name, query] of Object.entries(this.queries)) {
        this.events.emit('progress', this.status, `Running '${name}' query`);
        this.data[name] = await Query.run(query)
        this.status.records[name] = this.data[name].length;
        this.status.finished++;        
      }
      this.events.emit('progress', this.status, 'Data retrieved');
    }
  }

  async process(): Promise<void> {
    if (this._processFn) {
      return this._processFn(this)
        .then(() => { this.status.finished++; });
    } else return Promise.resolve();
  }

  async generate(): Promise<void> {
    const sg = await Spidergram.load();
    this.events.emit('progress', this.status, 'Generating files');

    if (this._generateFn) {
      return this._generateFn(this)
        .then(() => { this.status.finished++; });
    } else {
      const fileName = 'report.xslx';
      const rpt = new FileTools.Spreadsheet();
      for (const [name, data] of Object.entries(this.data)) {
        rpt.addSheet(data, name);
      }
      return sg.files().write(fileName, rpt.toBuffer())
        .then(() => {
          this.status.finished++;
          this.status.files.push(fileName);
        });
    }
  }

  async run(): Promise<ReportStatus> {
    this.status.startTime = Date.now();

    // Calculate rough progress
    this.status.total = 2 + Object.keys(this.queries).length;
    
    return this.generate()
      .then(() => this.process())
      .then(() => this.generate())
      .then(() => {
        this.status.finishTime = Date.now();
        this.events.emit('end', this.status);
        return this.status;
      })
  }
}