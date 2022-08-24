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
  workingDirectory: string,
  customHeaders: HeaderShape,
  browserPreset: Partial<HeaderGeneratorOptions>,
}

export const defaultFetcherOptions: FetcherOptions = {
  rules: {
    store: () => true,
    download: () => false,
    discard: () => false,
  },
  workingDirectory: 'crawl_data',
  customHeaders: {},
  browserPreset: BROWSER_PRESETS.MODERN_DESKTOP
}
export abstract class Fetcher extends EventEmitter {
  rules: FetchRules;
  defaultHeaders: HeaderShape;
  browserPreset: Partial<HeaderGeneratorOptions>;
  workingDirectory: string;

  constructor(customOptions: Partial<FetcherOptions> = {}) {
    super();
    const options: FetcherOptions = {
      ...defaultFetcherOptions,
      ...customOptions
    }

    this.workingDirectory = options.workingDirectory,
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
  
  abstract fetch(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
}
