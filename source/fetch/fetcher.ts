import { fileURLToPath } from 'node:url';
import { sync as mkdirp } from 'mkdirp';
import { EventEmitter } from 'eventemitter3';
import { Entity } from '@autogram/autograph';
import { FilterSet, Filter, Dictionary } from '../util/index.js';
import { UniqueUrl, ResponseShape } from '../graph/index.js';

export interface FetchRules extends FilterSet<ResponseShape> {
  store: Filter<ResponseShape>;
  download: Filter<ResponseShape>;
  discard: Filter<ResponseShape>;
}
export interface FetcherOptions {
  rules: FetchRules,
  downloadPath: string,
  headers: Dictionary<string>,
}

export const defaultFetcherOptions: FetcherOptions = {
  rules: {
    store: () => true,
    download: () => true,
    discard: () => false,
  },
  downloadPath: fileURLToPath(new URL('/data/downloads', import.meta.url)),
  headers: {},
}
export abstract class Fetcher extends EventEmitter {
  should: FetchRules;
  downloadPath: string;
  headers: Dictionary<string>;

  constructor(customOptions: Partial<FetcherOptions> = {}) {
    super();
    const options: FetcherOptions = {
      ...defaultFetcherOptions,
      ...customOptions
    }

    this.should = options.rules;
    this.downloadPath = options.downloadPath;
    this.headers = options.headers;

    mkdirp(this.downloadPath);
  }
  
  abstract fetch(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
  abstract check(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
}
