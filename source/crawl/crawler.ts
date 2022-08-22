import PQueue from 'p-queue';
import { EventEmitter } from 'eventemitter3';
import { GraphLike, UniqueUrlSet } from '../graph/index.js';
import { Fetcher } from '../fetch/index.js';
import { Filter, FilterSet, INTERVALS } from '../util/types.js';

export interface ConcurrencyOptions {
  concurrency: number;
  interval: number;
  intervalCap: number;
  timeout: number;
  autoStart: boolean;
}

const concurrencyDefaults: ConcurrencyOptions = {
  concurrency: 20,
  interval: INTERVALS.second,
  intervalCap: 5,
  timeout: INTERVALS.minute * 3,
  autoStart: false,
};

export const CrawlRules: FilterSet<ParsedUrl> = {
  check: (url: ParsedUrl) => true,
  fetch: (url: ParsedUrl) => true,
  follow: (url: ParsedUrl) => true,
  ignore: (url: ParsedUrl) => true,
}

export abstract class Crawler extends EventEmitter {
  queue: PQueue;
  
  constructor(
    public graph: GraphLike,
    public fetcher: Fetcher,
    throttle: Partial<ConcurrencyOptions> = {} 
) {
    super();
    this.queue = new PQueue({
      ...concurrencyDefaults,
      ...throttle
    });
  }

  abstract crawl(urls?: UniqueUrlSet): Promise<void>;
}

export type CrawlUpdate = {
  message: string;
  status: {
    processed: number;
    discovered: number;
    remaining: number;
    failed: number;
  };
  complete: boolean;
};
