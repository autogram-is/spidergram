import { UrlFilter } from '@autogram/url-tools';
import { EventEmitter } from 'node:events';
import PQueue from 'p-queue';
import { Entity, UniqueUrlSet } from '../graph/index.js';
import { ParsedUrl, FilterSet } from '../util/index.js';

export interface CrawlProgress extends Record<string, number> {
  total: number,
  fetched: number,
  skipped: number,
  errors: number
}

export interface CrawlRules extends FilterSet<ParsedUrl> {
  ignore: UrlFilter;
}
export interface Crawler extends EventEmitter {
  rules: CrawlRules;
  progress: CrawlProgress;
  crawl(urls?: UniqueUrlSet): Promise<Entity[]>;
}