import EventEmitter from 'node:events';
import {AqlQuery} from 'arangojs/aql.js';
import is from '@sindresorhus/is';
import {JsonObject} from 'type-fest';
import {Project, Vertice, aql} from '../index.js';
import {WorkerStatus} from './index.js';

export type VerticeWorkerTask<T extends Vertice = Vertice> = (item: T, context: Project) => Promise<void>;

export interface VerticeWorkerOptions<T extends Vertice = Vertice> {
  context?: Promise<Project>;
  items?: T[];
  collection?: string;
  filter?: AqlQuery;
  task: VerticeWorkerTask<T>;
}

export class VerticeWorker<T extends Vertice = Vertice> extends EventEmitter {
  protected status: WorkerStatus;
  protected context: Promise<Project>;

  constructor(protected options: Partial<VerticeWorkerOptions<T>> = {}) {
    super();
    this.status = {
      started: 0,
      finished: 0,
      processed: 0,
      errors: {},
      total: 0,
    };
    this.context = options.context ?? Project.context();
  }

  async run(options: Partial<VerticeWorkerOptions<T>> = {}): Promise<WorkerStatus> {
    const context = await this.context;

    const workerOptions = {
      ...this.options,
      ...options,
    };

    this.status.started = Date.now();

    if (is.undefined(workerOptions.task)) {
      throw new Error('No work task was given');
    } else if (is.nonEmptyArray(workerOptions.items)) {
      this.status.total = workerOptions.items.length;

      for (const v of workerOptions.items) {
        await this.performTask(v, workerOptions.task, context);
      }

      this.status.finished = Date.now();
      return this.status;
    } else if (is.nonEmptyStringAndNotWhitespace(workerOptions.collection)) {
      const collection = context.graph.collection(workerOptions.collection);
      const query = aql`
        FOR item in ${collection}
        ${workerOptions.filter}
        return item
      `;

      return context.graph.query<JsonObject>(query, {count: true})
        .then(async cursor => {
          this.status.total = cursor.count ?? 0;
          for await (const item of cursor) {
            await this.performTask(Vertice.fromJSON(item) as T, workerOptions.task!, context);
          }
        })
        .then(() => {
          this.status.finished = Date.now();
          return this.status;
        });
    } else {
      throw new Error('No items or collection were given');
    }
  }

  async performTask(item: T, task: VerticeWorkerTask<T>, context: Project): Promise<void> {
    return task(item, context).then(() => {
      this.status.processed++;
    })
      .catch(error => {
        this.status.errors[item.key] = error;
      })
      .finally(() => {
        this.emit('progress', this.status);
      });
  }
}
