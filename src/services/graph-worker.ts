import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { AqlQuery } from 'arangojs/aql.js';
import is from '@sindresorhus/is';
import { JsonMap } from '@salesforce/ts-types';
import {
  Project,
  Vertice,
  aql,
  ProjectConfig,
  ArangoStore,
  JobStatus,
} from '../index.js';

export type GraphWorkerTask<T extends Vertice = Vertice> = (
  item: T,
) => Promise<void>;

export interface GraphWorkerOptions<T extends Vertice = Vertice> {
  project?: Partial<ProjectConfig>;
  items?: T[];
  collection?: string;
  filter?: AqlQuery;
  limit?: number;
  batchSize?: number;
  task: GraphWorkerTask<T>;
}

type GraphWorkerEvents = Record<PropertyKey, unknown[]> & {
  progress: [status: JobStatus];
  end: [status: JobStatus]
}

export class GraphWorker<
  T extends Vertice = Vertice,
  Events extends GraphWorkerEvents = GraphWorkerEvents
> extends AsyncEventEmitter<Events> {
  readonly status: JobStatus;
  protected project!: Project;
  protected graph!: ArangoStore;

  constructor(protected options: Partial<GraphWorkerOptions<T>> = {}) {
    super();
    this.status = {
      startTime: 0,
      finishTime: 0,
      finished: 0,
      failed: 0,
      total: 0,
    };
  }

  async run(options: Partial<GraphWorkerOptions<T>> = {}): Promise<JobStatus> {
    const workerOptions = {
      ...this.options,
      ...options,
    };

    if (workerOptions.task === undefined) {
      throw new Error('No worker task was given');
    }

    const project = await Project.config(workerOptions.project);
    const graph = await project.graph();

    this.status.startTime = Date.now();

    if (is.undefined(workerOptions.task)) {
      throw new Error('No work task was given');
    } else if (is.nonEmptyArray(workerOptions.items)) {
      this.status.total = workerOptions.items.length;

      for (const v of workerOptions.items) {
        await this.performTask(v, workerOptions.task);
      }

      this.status.finishTime = Date.now();
      return this.status;
    } else if (is.nonEmptyStringAndNotWhitespace(workerOptions.collection)) {
      const collection = graph.collection(workerOptions.collection);
      const query = aql`
        FOR item in ${collection}
        ${workerOptions.filter}
        return item
      `;

      return graph
        .query<JsonMap>(query, { count: true, batchSize: 10 })
        .then(async cursor => {
          this.status.total = cursor.count ?? 0;
          for await (const batch of cursor.batches) {
            await Promise.all(
              batch.map(value =>
                this.performTask(
                  Vertice.fromJSON(value) as T,
                  workerOptions.task as GraphWorkerTask,
                ),
              ),
            );
          }
        })
        .then(() => {
          this.status.finishTime = Date.now();
          const elapsed = this.status.finishTime - this.status.startTime;
          this.status.elapsed = elapsed;
          this.status.average = elapsed / this.status.total;
          this.emit('end', this.status);
          return this.status;
        });
    } else {
      throw new Error('No items or collection were given');
    }
  }

  async performTask(item: T, task: GraphWorkerTask<T>): Promise<void> {
    return task(item)
      .then(() => {
        this.status.finished++;
      })
      .catch(error => {
        this.status.failed++;
        this.status.lastError = error;
      })
      .finally(() => {
        this.emit('progress', this.status);
      });
  }
}
