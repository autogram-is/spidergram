import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { Entity } from '@autogram/autograph';
import { FingerprintGenerator, HeaderGeneratorOptions } from 'fingerprint-generator';
import * as BROWSER_PRESETS from './browser-presets.js';
import { FilterSet, Filter } from '../util/index.js';
import { UniqueUrl, ResponseShape, HeaderShape } from '../graph/index.js';

export interface FetchRules extends FilterSet<ResponseShape> {
  store: Filter<ResponseShape>;
  download: Filter<ResponseShape>;
  discard: Filter<ResponseShape>;
}
export interface FetcherOptions {
  rules: FetchRules,
  filePath: string,
  customHeaders: HeaderShape,
  browserPreset: Partial<HeaderGeneratorOptions>,
}

export const defaultFetcherOptions: FetcherOptions = {
  rules: {
    store: () => true,
    download: () => true,
    discard: () => false,
  },
  filePath: 'download/',
  customHeaders: {},
  browserPreset: BROWSER_PRESETS.MODERN_DESKTOP
}
export abstract class Fetcher extends EventEmitter {
  rules: FetchRules;
  defaultHeaders: HeaderShape;
  browserPreset: Partial<HeaderGeneratorOptions>;
  filePath: string;

  constructor(customOptions: Partial<FetcherOptions> = {}) {
    super();
    const options: FetcherOptions = {
      ...defaultFetcherOptions,
      ...customOptions
    }

    this.filePath = fileURLToPath(new URL('/data/downloads', import.meta.url)),
    this.rules = options.rules;
    this.defaultHeaders = options.customHeaders;
    this.browserPreset = options.browserPreset;
  }

  buildRequestHeaders(customHeaders: HeaderShape = {}): HeaderShape {
    const generator = new FingerprintGenerator(this.browserPreset);
    return {
      ...this.defaultHeaders,
      ...generator.getHeaders(),
      ...customHeaders
    }
  }
  
  abstract check(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
  abstract fetch(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
}
