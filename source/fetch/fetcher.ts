import { sync as mkdirp } from 'mkdirp';
import { EventEmitter } from 'eventemitter3';
import { Entity } from '@autogram/autograph';
import { FingerprintGenerator, HeaderGeneratorOptions } from 'fingerprint-generator';
import { BROWSER_PRESETS } from './browser-presets.js';
import { FilterSet, Filter, Dictionary } from '../util/index.js';
import { UniqueUrl, HeaderShape, RequestShape, ResponseShape } from '../graph/index.js';

export interface FetchRules extends FilterSet<ResponseShape> {
  store: Filter<ResponseShape>;
  download: Filter<ResponseShape>;
  discard: Filter<ResponseShape>;
}
export interface FetcherOptions {
  rules: FetchRules,
  headers: Dictionary<string>,
  browserPreset: Partial<HeaderGeneratorOptions>,
}

export const defaultFetcherOptions: FetcherOptions = {
  rules: {
    store: () => true,
    download: () => true,
    discard: () => false,
  },
  headers: {},
  browserPreset: BROWSER_PRESETS.MODERN_DESKTOP
}
export abstract class Fetcher extends EventEmitter {
  should: FetchRules;
  headers: Dictionary<string>;
  browserPreset: Partial<HeaderGeneratorOptions>;

  constructor(customOptions: Partial<FetcherOptions> = {}) {
    super();
    const options: FetcherOptions = {
      ...defaultFetcherOptions,
      ...customOptions
    }

    this.should = options.rules;
    this.headers = options.headers;
    this.browserPreset = options.browserPreset;
  }
  
  abstract fetch(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
  abstract check(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
}
