import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { ArangoCollection, isArangoCollection } from 'arangojs/collection.js';
import { AqStrict, AqQuery, AqBuilder } from 'aql-builder';
import _ from 'lodash';
import PQueue from 'p-queue';
import { Entity, Query, JobStatus, Spidergram } from '../../index.js';

/**
 * Options to manage the {@link WorkerQuery}'s rate and concurrency.
 */
export interface WorkerQueryOptions extends Record<string, unknown> {
  /**
   * The number of workers to run simultaneously.
   *
   * @defaultValue 1
   */
  concurrency?: number;

  /**
   * The maximum number of workers to launch within the interval period.
   * Setting the limit to -1 disables rate limiting.
   *
   * @defaultValue Infinity
   */
  intervalCap?: number;

  /**
   * The time (in ms) that the limit applies to.
   *
   * @defaultValue 0
   */
  interval?: number;
}

const defaults: Required<WorkerQueryOptions> = {
  concurrency: 1,
  intervalCap: Infinity,
  interval: 0,
};

type WorkerEventMap = Record<PropertyKey, unknown[]> & {
  progress: [status: JobStatus, item?: Entity, message?: string];
  failure: [status: JobStatus, error?: Error, message?: string];
  end: [status: JobStatus];
};

type WorkerEventType = keyof WorkerEventMap;
type WorkerEventParams<T extends WorkerEventType> = WorkerEventMap[T];
type WorkerEventListener<T extends WorkerEventType> = (
  ...args: WorkerEventParams<T>
) => unknown;

export type WorkerQueryTask<T extends Entity = Entity> = (
  item: T,
  status: JobStatus,
) => Promise<string | void>;

export class WorkerQuery<T extends Entity = Entity> extends AqBuilder {
  protected events: AsyncEventEmitter<WorkerEventMap>;

  status: JobStatus;
  options: Required<WorkerQueryOptions>;

  /**
   * Returns a new {@link AqBuilder} containing a buildable {@link AqStrict}.
   */
  constructor(
    input: string | ArangoCollection | AqStrict | AqQuery,
    options: WorkerQueryOptions = {},
  ) {
    const validCollections = [...Entity.types.keys()];
    let collectionName = '';

    if (typeof input === 'string') {
      collectionName = input;
    } else if (isArangoCollection(input)) {
      collectionName = input.name;
    } else {
      if (isArangoCollection(input.collection)) {
        collectionName = input.collection.name;
      } else {
        collectionName = input.collection;
      }
    }

    if (!validCollections.includes(collectionName)) {
      throw new Error(`'${collectionName}' is not a valid entity collection`);
    }
    super(input);

    // Force the query to return only the key
    this.spec.return = [{ name: '_id' }];

    // Set up the internal queue options and event emitter
    this.options = _.defaultsDeep(options, defaults);
    this.events = new AsyncEventEmitter<WorkerEventMap>();

    this.status = {
      startTime: 0,
      finishTime: 0,
      finished: 0,
      failed: 0,
      total: 0,
    };
  }

  on<T extends WorkerEventType>(
    event: T,
    listener: WorkerEventListener<T>,
  ): this {
    this.events.on<T>(event, listener);
    return this;
  }

  off<T extends WorkerEventType>(
    event: T,
    listener: WorkerEventListener<T>,
  ): this {
    if (listener) {
      this.events.removeListener<WorkerEventType>(event, listener);
      return this;
    } else {
      this.events.removeAllListeners<WorkerEventType>(event);
      return this;
    }
  }

  // We don't allow alteration of the return value; we may want to
  // log or throw an error here.
  override return(): this {
    return this;
  }

  async run(
    task: WorkerQueryTask<T> = () => Promise.resolve(),
  ): Promise<JobStatus> {
    const ids = await Query.run<string>(this.build());

    const queue = new PQueue(this.options);
    this.status.total = ids.length;
    this.status.startTime = Date.now();

    await queue.addAll(ids.map(id => () => this.performTask(id, task)));

    this.status.finishTime = Date.now();
    this.events.emit('end', this.status);
    return Promise.resolve(this.status);
  }

  protected async performTask(
    id: string,
    task: WorkerQueryTask<T>,
  ): Promise<void> {
    const sg = await Spidergram.load();
    const item = await sg.arango.findById<T>(Entity.idFromReference(id));
    if (item === undefined) {
      this.status.failed++;
      return Promise.reject();
    }

    return task(item, this.status)
      .then(message => {
        this.updateStatus();
        if (typeof message === 'string')
          this.events.emit('progress', this.status, item, message);
        else this.events.emit('progress', this.status, item);
      })
      .catch(error => {
        this.updateStatus(false);
        this.status.lastError = error;
        this.events.emit('progress', this.status, item, error.message);
        this.events.emit('failure', this.status, error, error.message);
      });
  }

  protected updateStatus(success = true) {
    if (success) {
      this.status.finished++;
    } else {
      this.status.failed++;
    }
    const elapsed =
      (this.status.finishTime ?? Date.now()) - this.status.startTime;
    this.status.elapsed = elapsed;
    this.status.average = elapsed / this.status.total;
  }
}
