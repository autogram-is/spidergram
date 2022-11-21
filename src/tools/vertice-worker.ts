import EventEmitter from 'node:events';
import {AqlQuery} from 'arangojs/aql.js';
import is from '@sindresorhus/is';
import {JsonObject} from 'type-fest';
import {Project, Vertice, aql, ProjectConfig, ArangoStore, JobStatus} from '../index.js';

export type VerticeWorkerTask<T extends Vertice = Vertice> = (item: T) => Promise<void>;

export interface VerticeWorkerOptions<T extends Vertice = Vertice> {
  project?: Partial<ProjectConfig>;
  items?: T[];
  collection?: string;
  filter?: AqlQuery;
  limit?: number;
  batchSize?: number;
  task: VerticeWorkerTask<T>;
}

export class VerticeWorker<T extends Vertice = Vertice> extends EventEmitter {
  readonly status: JobStatus;
  protected project!: Project;
  protected graph!: ArangoStore;

  constructor(protected options: Partial<VerticeWorkerOptions<T>> = {}) {
    super();
    this.status = {
      startTime: 0,
      finishTime: 0,
      finished: 0,
      failed: 0,
      total: 0,
    };
  }

  async run(options: Partial<VerticeWorkerOptions<T>> = {}): Promise<JobStatus> {
    const workerOptions = {
      ...this.options,
      ...options,
    };

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

      return graph.query<JsonObject>(query, {count: true, batchSize: 10})
        .then(async cursor => {
          this.status.total = cursor.count ?? 0;
          for await (const batch of cursor.batches) {
            await Promise.all(batch.map(
              value => this.performTask(Vertice.fromJSON(value) as T, workerOptions.task!)
            ));
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

  async performTask(item: T, task: VerticeWorkerTask<T>): Promise<void> {
    return task(item).then(() => {
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
