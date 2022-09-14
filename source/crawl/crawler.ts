import { EventEmitter } from 'node:events';
import { UrlFilter } from '@autogram/url-tools';
import { Graph, Readable, Mutable } from '@autogram/autograph';
import { UniqueUrl } from '../graph/index.js';
import { ParsedUrl, FilterSet } from '../util/index.js';

export interface GraphHandle extends Graph, Readable, Mutable {}

export interface CrawlProgress extends Record<string, number> {
  total: number;
  fetched: number;
  found: number;
  skipped: number;
  errors: number;
}

export interface CrawlRules extends FilterSet<ParsedUrl> {
  isTarget: UrlFilter;
  ignore: UrlFilter;
}

export interface CrawlOptions {
  rules?: Partial<CrawlRules>;
  graph?: GraphHandle;
}

export interface Crawler extends EventEmitter {
  rules: CrawlRules;
  progress: CrawlProgress;
  graph: GraphHandle;

  crawl(urls: UniqueUrl[]): Promise<void>;
}
