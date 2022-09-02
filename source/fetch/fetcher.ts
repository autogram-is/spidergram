import { EventEmitter } from 'node:events';
import { Entity } from '@autogram/autograph';
import {
  FingerprintGenerator,
  HeaderGeneratorOptions,
} from 'fingerprint-generator';
import { FilterSet, Filter } from '../util/index.js';
import { UniqueUrl, ResponseShape, HeaderShape } from '../graph/index.js';
import * as BROWSER_PRESETS from './browser-presets.js';

export interface FetchRules extends FilterSet<ResponseShape> {
  store: Filter<ResponseShape>;
  download: Filter<ResponseShape>;
  discard: Filter<ResponseShape>;
}
export interface FetchOptions {
  rules: FetchRules;
  workingDirectory: string;
  customHeaders: HeaderShape;
  browserPreset: Partial<HeaderGeneratorOptions>;
}

export const defaultFetchOptions: FetchOptions = {
  rules: {
    store: () => true,
    download: () => false,
    discard: () => false,
  },
  workingDirectory: 'crawl_data',
  customHeaders: {},
  browserPreset: BROWSER_PRESETS.MODERN_DESKTOP,
};
export abstract class Fetcher extends EventEmitter {
  rules: FetchRules;
  defaultHeaders: HeaderShape;
  browserPreset: Partial<HeaderGeneratorOptions>;
  workingDirectory: string;

  constructor(customOptions: Partial<FetchOptions> = {}) {
    super();
    const options: FetchOptions = {
      ...defaultFetchOptions,
      ...customOptions,
    };
    this.workingDirectory = options.workingDirectory;
    this.rules = options.rules;
    this.defaultHeaders = options.customHeaders;
    this.browserPreset = options.browserPreset;
  }

  eventNames(): string[] {
    return ['start', 'skip', 'fetch', 'fail'];
  }

  buildRequestHeaders(customHeaders: HeaderShape = {}): HeaderShape {
    const generator = new FingerprintGenerator(this.browserPreset);
    return {
      ...this.defaultHeaders,
      ...generator.getHeaders(),
      ...customHeaders,
    };
  }

  init(...args: unknown[]): void { }
  teardown(): void { }

  abstract fetch(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
}
