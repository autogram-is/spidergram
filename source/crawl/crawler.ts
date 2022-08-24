import { PartialDeep } from 'type-fest';
import PQueue from 'p-queue';
import { EventEmitter } from 'node:events';
import { GraphLike, Entity, UniqueUrlSet } from '../graph/index.js';
import { Fetcher } from '../fetch/index.js';
import { ParsedUrl, Filter, FilterSet, INTERVALS } from '../util/index.js';

export interface ConcurrencySettings {
  concurrency: number;
  interval: number;
  intervalCap: number;
  timeout: number;
  autoStart: boolean;
}

export interface CrawlerRules extends FilterSet<ParsedUrl> {
  check: Filter<ParsedUrl>,
  fetch: Filter<ParsedUrl>,
  follow: Filter<ParsedUrl>,
  ignore: Filter<ParsedUrl>
}

export interface CrawlerOptions {
  rules: CrawlerRules,
  concurrency: ConcurrencySettings
}

export const defaultCrawlOptions: CrawlerOptions = {
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
  }
};
export abstract class Crawler extends EventEmitter {
  queue: PQueue;
  rules: CrawlerRules;
  concurrency: ConcurrencySettings;

  constructor(
    public graph: GraphLike,
    public fetcher: Fetcher,
    customOptions: Partial<CrawlerOptions> = {} 
) {
    super();
    const options: CrawlerOptions = {
      ...defaultCrawlOptions
    };
    if (customOptions.rules) {
      options.rules =  {
        ...options.rules,
        ...customOptions.rules
      };
      if (customOptions.rules) 
        options.concurrency =  {
          ...options.concurrency,
          ...customOptions.concurrency
        };
    };

    this.rules = options.rules;
    this.concurrency = options.concurrency;
    this.queue = new PQueue(options.concurrency);
  }

  abstract crawl(urls?: UniqueUrlSet): Promise<Entity[]>
}