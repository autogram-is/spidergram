import { EventEmitter } from 'node:events';
import PQueue from 'p-queue';
import { Entity, UniqueUrlSet } from '../graph/index.js';
import { ParsedUrl, FilterSet } from '../util/index.js';

export interface Crawler extends EventEmitter {
  crawl(urls?: UniqueUrlSet): Promise<Entity[]>;
}