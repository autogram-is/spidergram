// A wrapper around UniqueUrlSet that maintains four internal pools:
// - Candidates, which have not yet been enqueued
// - Queue, urls currently being processed
// - Complete, urls whose processing has been completed successfully.
// - Incomplete, URLs whose processing was cut short by filters or an error.

// Workflow goes like so:
// 1. Crawler creates a UrlQueue, specifying queue throttling/concurrency options
// 2. Crawler populates UrlQueue with one or more UniqueUrl instances.
// 3. Crawler requests a URL from the Queue, performing any necessary filtering
// 4. If the URL is not to be processed, Crawler calls `queue.reject(url)`
// 5. If the URL is to be processed, Crawler adds a Promise<void> returning task
//    to the queue.
// 6.

import is from '@sindresorhus/is';
import PQueue from 'p-queue';
import { Uuid } from '@autogram/autograph';
import { NormalizedUrl } from '@autogram/url-tools';
import { INTERVALS } from '../index.js';
import { UniqueUrlSet, UniqueUrl } from '../graph/index.js';

export type UrlQueueFunction = (uu: UniqueUrl) => Promise<void>;

export interface ConcurrencyOptions {
  concurrency?: number;
  interval?: number;
  intervalCap?: number;
  timeout?: number;
  autoStart?: boolean;
}

const concurrencyDefaults: ConcurrencyOptions = {
  concurrency: 20,
  interval: INTERVALS.second,
  intervalCap: 5,
  timeout: INTERVALS.minute * 3,
  autoStart: true,
};

export class UniqueUrlPool extends UniqueUrlSet {
  candidates: UniqueUrl[] = [];
  skipped: UniqueUrl[] = [];
  completed: UniqueUrl[] = [];
  queue: PQueue;
  queueFunction: UrlQueueFunction;

  public constructor(
    customFunction: UrlQueueFunction,
    concurrency: Partial<ConcurrencyOptions> = {},
  ) {
    super();
    const concurrencyOptions = { ...concurrencyDefaults, ...concurrency };
    this.queue = new PQueue(concurrencyOptions);
    this.queueFunction = customFunction;
  }

  add(value: string | UniqueUrl | NormalizedUrl): this {
    const uu = super.parse(value);
    if (uu) {
      this.candidates.push(uu);
      super.add(uu);
    }

    return this;
  }

  next(): UniqueUrl | false {
    const uu = this.candidates.shift();
    return is.undefined(uu) ? false : uu;
  }

  async schedule(
    uu: UniqueUrl,
    customFunction?: UrlQueueFunction,
  ): Promise<void> {
    const func = customFunction ?? this.queueFunction;
    const promise = this.queue.add(async () => {
      return func(uu).then(() => {
        this.completed.push(uu);
      });
    });

    return promise;
  }

  skip(uu: UniqueUrl): void {
    this.skipped.push(uu);
  }

  complete(uu: UniqueUrl): void {
    this.completed.push(uu);
  }

  hasUrls(): boolean {
    return this.queue.pending + this.queue.size + this.candidates.length > 0;
  }
}
