import {RequestQueue, EnqueueStrategy, RequestTransform} from 'crawlee';
import {NormalizedUrl, ParsedUrl} from '@autogram/url-tools';
import {SpiderContext, CombinedContext} from '../../index.js';
import {FilterInput} from './index.js';

export async function ensureOptions(
  context: CombinedContext,
  options: Partial<EnqueueUrlOptions> = {}
): Promise<EnqueueUrlOptions> {
  if (options._built) {
    return options as EnqueueUrlOptions;
  } else {
    const results = {
      requestQueue: await context.crawler.getRequestQueue(),
      ...urlDiscoveryDefaultOptions,
      ...context.urlOptions,
      ...options,
      _built: true,
    };
    return results;
  }
}

export interface EnqueueUrlOptions {
  limit: number;
  selector: string;
  save: FilterInput;
  enqueue: FilterInput;
  skipUnparsableLinks: boolean;
  skipEmptyLinks: boolean;
  skipAnchors: boolean;
  skipNonWebLinks: boolean,
  normalizer: UrlMutatorWithContext;
  transformRequestFunction?: RequestTransform;
  baseUrl?: string;
  requestQueue?: RequestQueue;
  label?: string;
  _built?: boolean;
}

export type UrlMutatorWithContext<T = unknown> = (
  found: ParsedUrl,
  context?: SpiderContext
) => ParsedUrl;

const urlDiscoveryDefaultOptions: EnqueueUrlOptions = {
  limit: Number.POSITIVE_INFINITY,
  selector: 'a',
  save: EnqueueStrategy.All,
  enqueue: EnqueueStrategy.SameDomain,
  skipEmptyLinks: true,
  skipAnchors: true,
  skipNonWebLinks: false,
  skipUnparsableLinks: false,
  normalizer: (url, context) => NormalizedUrl.normalizer(url),
};

 export type AnchorTagData = {
  href: string;
  selector?: string;
  label?: string;
  text?: string;
  attributes?: Record<string, string>;
  data?: unknown;
};
