import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { ArangoCollection, isArangoCollection } from 'arangojs/collection.js';
import { AqStrict, AqQuery, AqBuilder } from 'aql-builder';
import { Query } from './query.js';
import { Entity, JobStatus, Spidergram } from '../../index.js';

type WorkerEventMap = Record<PropertyKey, unknown[]> & {
  progress: [status: JobStatus, item: Entity, message?: string];
  fail: [status: JobStatus, error?: Error, message?: string];
  complete: [status: JobStatus];
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
  status: JobStatus;
  protected events: AsyncEventEmitter<WorkerEventMap>;

  /**
   * Returns a new {@link AqBuilder} containing a buildable {@link AqStrict}.
   */
  constructor(input: string | ArangoCollection | AqStrict | AqQuery) {
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

  async run(task: WorkerQueryTask<T>): Promise<JobStatus> {
    const sg = await Spidergram.load();
    const ids = await Query.run<string>(this.build());

    this.status.total = ids.length;
    this.status.startTime = Date.now();

    for (const id of ids) {
      const v = await sg.arango.findById<T>(Entity.idFromReference(id));
      if (v === undefined) {
        this.status.failed++;
      } else {
        await this.performTask(v, task);
      }
    }

    this.status.finishTime = Date.now();
    this.events.emit('end', this.status);
    return Promise.resolve(this.status);
  }

  protected async performTask(
    item: T,
    task: WorkerQueryTask<T>,
  ): Promise<void> {
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
        this.events.emit('fail', this.status, error, error.message);
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
