import is from '@sindresorhus/is';
import { EventEmitter } from "node:events";
import PQueue from "p-queue";
import { Entity, UniqueUrl, UniqueUrlSet } from '../graph/index.js'
import { ParsedUrl } from '@autogram/url-tools';
import { INTERVALS, FilterSet } from "../index.js";
import { Crawler } from "./crawler.js";
import { Fetcher, GotFetcher } from "../fetch/index.js";

const queueSettings = {
  concurrency: 20,
  interval: INTERVALS.second,
  intervalCap: 5,
  timeout: INTERVALS.minute * 3,
  autoStart: false,
};

export class SimpleCrawler extends EventEmitter implements Crawler {
  fetcher: Fetcher;
  queue: PQueue;
  rules: FilterSet<ParsedUrl> = {};
  postProcessor?: (uu: UniqueUrl, entities: Entity[]) => Entity[];

  constructor(
    customFetcher?: Fetcher
  ) {
    super();
    this.fetcher = customFetcher ?? new GotFetcher();
    this.queue = new PQueue(queueSettings);
  }

  async crawl(urls: UniqueUrlSet): Promise<Entity[]> {
    let results: Entity[] = [];

    return new Promise((resolve) => {
      for (const uu of urls.values()) {
        this.queue.add(async () => {
          return this.fetcher.fetch(uu)
            .then((entities: Entity[]): Entity[]  => {
              if (is.function_(this.postProcessor)) {
                return this.postProcessor(uu, entities);
              } else {
                return entities;
              }
            })
            .then((entities: Entity[]): void => {
              results = [...results, ...entities];
              this.emit('processed', uu);
            })
            .catch((reason: unknown) => {
              this.emit('error', uu, reason);
            });
        });
      }

      this.queue.onIdle().then(() => {
        this.emit('complete');
        resolve(results);
      });

    });
  }
}