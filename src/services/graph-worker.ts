import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { GeneratedAqlQuery, isGeneratedAqlQuery } from 'arangojs/aql.js';
import {
  AqQuery,
  AqFilter,
  Project,
  Vertice,
  Query,
  ArangoStore,
  JobStatus,
  isAqQuery,
  isAqFilter,
  Reference,
} from '../index.js';

export type EntityWorkerTask<T extends Vertice = Vertice> = (
  item: T,
) => Promise<string | void>;

export interface EntityWorkerOptions<T extends Vertice = Vertice> {
  collection: string;
  items?: Reference<T>[];
  query?: AqFilter | AqQuery['filters'] | AqQuery | GeneratedAqlQuery | Query;
  limit?: number;
  errors?: string;
  task?: EntityWorkerTask<T>;
}

type EntityWorkerEvents = Record<PropertyKey, unknown[]> & {
  progress: [status: JobStatus, message?: string];
  end: [status: JobStatus];
};

export class EntityWorker<
  T extends Vertice = Vertice,
  Events extends EntityWorkerEvents = EntityWorkerEvents,
> extends AsyncEventEmitter<Events> {
  readonly status: JobStatus;
  protected project!: Project;
  protected graph!: ArangoStore;

  constructor(protected options: EntityWorkerOptions<T>) {
    super();
    this.status = {
      startTime: 0,
      finishTime: 0,
      finished: 0,
      failed: 0,
      total: 0,
    };
  }

  async run(options: Partial<EntityWorkerOptions<T>> = {}): Promise<JobStatus> {
    const opt: EntityWorkerOptions<T> = {
      ...options,
      ...this.options,
    };

    if (opt.task === undefined) {
      throw new Error('No worker task was given');
    }

    if (
      opt.items === undefined &&
      opt.query === undefined &&
      opt.collection == undefined
    ) {
      throw new Error('No items or query given');
    }

    // return this.status;
    const project = await Project.config();
    const graph = await project.graph();

    this.status.startTime = Date.now();
    let workItems: Reference[] = [];

    if (Array.isArray(opt.items) && opt.items.length > 0) {
      workItems = opt.items;
    } else {
      // Populate the pool of workItems
      if (isAqFilter(opt.query)) {
        if (opt.collection === undefined) {
          throw new Error('No collection given');
        }
        const q = new Query({
          collection: opt.collection,
          filters: [opt.query],
          return: ['_key'],
          limit: opt.limit,
        });
        workItems = await q.run<string>();
      }
      if (Array.isArray(opt.query)) {
        if (opt.collection === undefined) {
          throw new Error('No collection given');
        }
        const q = new Query({
          collection: opt.collection,
          filters: opt.query,
          return: ['_key'],
          limit: opt.limit,
        });
        workItems = await q.run<string>();
      } else if (isAqQuery(opt.items)) {
        const q = new Query(opt.items);
        if (opt.limit) q.limit(opt.limit);
        workItems = await q.run<string>();
      } else if (opt.items instanceof Query) {
        if (opt.limit) opt.items.limit(opt.limit);
        workItems = await opt.items.run<string>();
      } else if (isGeneratedAqlQuery(opt.items)) {
        workItems = await Query.run<string>(opt.items);
      } else if (opt.items === undefined) {
        const q = new Query(opt.collection).return('_key');
        workItems = await q.run<string>();
      }
    }

    this.status.total = workItems.length;
    for (const item of workItems) {
      if (item instanceof Vertice) {
        await this.performTask(item as T, opt.task);
      } else {
        const v = await graph.findById<T>(Vertice.idFromReference(item));
        if (v) {
          await this.performTask(v, opt.task);
        } else {
          this.status.failed++;
        }
      }
      this.status.finishTime = Date.now();
    }

    return Promise.resolve(this.status);
  }

  async performTask(item: T, task: EntityWorkerTask<T>): Promise<void> {
    return task(item)
      .then(message => {
        this.status.finished++;
        increment(this.status);
        if (typeof message === 'string')
          this.emit('progress', this.status, message);
        else this.emit('progress', this.status);
      })
      .catch(error => {
        increment(this.status);
        this.status.failed++;
        this.status.lastError = error;
        this.emit('progress', this.status);
      });
  }
}

function increment(status: JobStatus) {
  const elapsed = status.finishTime - status.startTime;
  status.elapsed = elapsed;
  status.average = elapsed / status.total;
}
