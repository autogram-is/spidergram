import { EventEmitter } from 'node:events';
import PQueue from 'p-queue';
import { Graph, Mutable, Readable } from '@autogram/autograph';
import { Entity, UniqueUrlSet } from '../graph/index.js';
import { Fetcher } from '../fetch/index.js';
import { ParsedUrl, Filter, FilterSet, INTERVALS } from '../util/index.js';

export interface ConcurrencySettings {
  concurrency: number;
  interval: number;
  intervalCap: number;
  timeout: number;
  autoStart: boolean;
}

export interface CrawlRules extends FilterSet<ParsedUrl> {
  check: Filter<ParsedUrl>;
  fetch: Filter<ParsedUrl>;
  follow: Filter<ParsedUrl>;
  ignore: Filter<ParsedUrl>;
}

export interface CrawlOptions {
  rules: CrawlRules;
  concurrency: ConcurrencySettings;
}

export const defaultCrawlOptions: CrawlOptions = {
  rules: {
    check: (url: ParsedUrl) => true,
    fetch: (url: ParsedUrl) => true,
    follow: (url: ParsedUrl) => true,
    ignore: (url: ParsedUrl) => true,
  },
  concurrency: {
    concurrency: 20,
    interval: INTERVALS.second,
    intervalCap: 5,
    timeout: INTERVALS.minute * 3,
    autoStart: false,
  },
};
export abstract class Crawler extends EventEmitter {
  queue: PQueue;
  rules: CrawlRules;
  concurrency: ConcurrencySettings;

  constructor(
    public graph: Graph & Readable & Mutable,
    public fetcher: Fetcher,
    customOptions: Partial<CrawlOptions> = {},
  ) {
    super();
    const options: CrawlOptions = {
      ...defaultCrawlOptions,
    };
    if (customOptions.rules) {
      options.rules = {
        ...options.rules,
        ...customOptions.rules,
      };
      if (customOptions.rules)
        options.concurrency = {
          ...options.concurrency,
          ...customOptions.concurrency,
        };
    }

    this.rules = options.rules;
    this.concurrency = options.concurrency;
    this.queue = new PQueue(options.concurrency);
  }

  abstract crawl(urls?: UniqueUrlSet): Promise<Entity[]>;
}
