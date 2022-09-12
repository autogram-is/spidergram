import { EventEmitter } from 'node:events';
import { UrlFilter } from '@autogram/url-tools';
import { Entity, UniqueUrl } from '../graph/index.js';
import { ParsedUrl, FilterSet } from '../util/index.js';
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

export interface CrawlerOptions {
  rules?: CrawlRules;
}

export interface Crawler extends EventEmitter {
  rules: CrawlRules;
  progress: CrawlProgress;

  crawl(urls?: UniqueUrl[]): Promise<Entity[]>;
}
