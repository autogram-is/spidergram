import { EventEmitter } from 'node:events';
import is from '@sindresorhus/is';
import PQueue from 'p-queue';
import { ParsedUrl } from '@autogram/url-tools';
import { Entity, UniqueUrlSet, UniqueUrl } from '../graph/index.js';
import { INTERVALS } from '../index.js';
import { Fetcher, GotFetcher } from '../fetch/index.js';
import { Crawler } from './crawler.js';

export type PostFetchFunction = (uu: UniqueUrl, entities: Entity[]) => Entity[];

export interface QueueOptions {
  concurrency?: number;
  interval?: number;
  intervalCap?: number;
  timeout?: number;
  autoStart?: boolean;
}

export class SimpleCrawler extends EventEmitter implements Crawler {
  fetcher: Fetcher;
  postFetch: PostFetchFunction;

  rules = {
    ignore: (url: ParsedUrl) => false,
  };

  queueSettings: QueueOptions = {
    concurrency: 20,
    interval: INTERVALS.second,
    intervalCap: 5,
    timeout: INTERVALS.minute * 3,
    autoStart: true,
  };

  progress = {
    total: 0,
    fetched: 0,
    skipped: 0,
    errors: 0,
  };

  constructor(customFetcher?: Fetcher, postFetch?: PostFetchFunction) {
    super();
    this.fetcher = customFetcher ?? new GotFetcher();
    this.postFetch = postFetch ?? ((uu, entities) => entities);
  }

  eventNames(): string[] {
    return ['start', 'skip', 'fetch', 'error'];
  }

  async crawl(uus: UniqueUrlSet): Promise<Entity[]> {
    const queue = new PQueue(this.queueSettings);
    const promises: Array<Promise<void>> = [];
    const results: Entity[] = [];

    this.progress.total = uus.size;
    this.emit('start', this.progress);

    this.fetcher.on('fetch', (uu: UniqueUrl) => {
      this.progress.fetched++;
      this.emit('fetch', uu, this.progress);
    });

    this.fetcher.on('error', (uu: UniqueUrl) => {
      this.progress.errors++;
      this.emit('error', (reason: Error) => reason, uu, this.progress);
    });

    for (const uu of uus.values()) {
      if (is.urlInstance(uu.parsed) && this.rules.ignore(uu.parsed)) {
        this.progress.skipped++;
        this.emit('skip', uu, this.progress);
      }

      promises.push(
        queue.add(async () => {
          await this.fetcher
            .fetch(uu)
            .then((entities) => this.postFetch(uu, entities))
            .then((entities) => {
              results.push(...entities);
            });
        }),
      );
    }

    await Promise.all(promises);
    this.emit('finish', this.progress);
    return results;
  }
}
