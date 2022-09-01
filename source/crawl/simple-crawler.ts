import { EventEmitter } from 'node:events';
import is from '@sindresorhus/is';
import PQueue from 'p-queue';
import { ParsedUrl } from '@autogram/url-tools';
import { Entity, UniqueUrl, UniqueUrlSet } from '../graph/index.js';
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
    return ['start', 'skip', 'fetch', 'error', 'finish'];
  }

  async crawl(urls: UniqueUrlSet): Promise<Entity[]> {
    const queue = new PQueue(this.queueSettings);
    this.progress.total = urls.size;
    let results: Entity[] = [];

    this.emit('start', this.progress);

    return new Promise((resolve) => {
      for (const uu of urls.values()) {
        if (is.urlInstance(uu.parsed) && this.rules.ignore(uu.parsed)) {
          this.progress.skipped++;
          this.emit('skip', uu, this.progress);
        }

        queue.add(async () => {
          await this.fetcher
            .fetch(uu)
            .then((entities) => this.postFetch(uu, entities))
            .then((entities) => {
              results = [...results, ...entities];
              this.progress.fetched++;
              this.emit('fetch', uu, this.progress);
            })
            .catch((error: unknown) => {
              this.progress.errors++;
              this.emit('error', error, uu, this.progress);
            });
        });
      }

      queue.onIdle().then(() => {
        this.emit('finish', this.progress);
        resolve(results);
      });
    });
  }
}
