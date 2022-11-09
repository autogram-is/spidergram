import EventEmitter from 'node:events';
import {AqlQuery} from 'arangojs/aql.js';
import is from '@sindresorhus/is';
import {JsonObject} from 'type-fest';
import {Project, Vertice, aql, ProjectConfig, ArangoStore} from '../index.js';

export interface WorkerStatus {
  [key: string]: unknown;
  started: number;
  finished: number;
  total: number;
  processed: number;
  errors: Record<string, Error>;
}

export type VerticeWorkerTask<T extends Vertice = Vertice> = (item: T) => Promise<void>;

export interface VerticeWorkerOptions<T extends Vertice = Vertice> {
  project?: Partial<ProjectConfig>;
  items?: T[];
  collection?: string;
  filter?: AqlQuery;
  task: VerticeWorkerTask<T>;
}

export class VerticeWorker<T extends Vertice = Vertice> extends EventEmitter {
  protected status: WorkerStatus;
  protected project!: Project;
  protected graph!: ArangoStore;

  constructor(protected options: Partial<VerticeWorkerOptions<T>> = {}) {
    super();
    this.status = {
      started: 0,
      finished: 0,
      processed: 0,
      errors: {},
      total: 0,
    };

    Project.config(this.options.project)
      .then(project => {
        this.project = project;
        return this.project.graph();
      })
      .then(graph => {
        this.graph = graph;
      })
      .catch((error: unknown) => {
        if (is.error(error)) throw error;
        throw new Error('Could not load Project defaults');
      });
  }

  async run(options: Partial<VerticeWorkerOptions<T>> = {}): Promise<WorkerStatus> {
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
        await this.performTask(v, workerOptions.task);
      }

      this.status.finished = Date.now();
      return this.status;
    } else if (is.nonEmptyStringAndNotWhitespace(workerOptions.collection)) {
      const collection = (await this.project.graph()).collection(workerOptions.collection);
      const query = aql`
        FOR item in ${collection}
        ${workerOptions.filter}
        return item
      `;

      return (await this.project.graph()).query<JsonObject>(query, {count: true})
        .then(async cursor => {
          this.status.total = cursor.count ?? 0;
          for await (const item of cursor) {
            await this.performTask(Vertice.fromJSON(item) as T, workerOptions.task!);
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
