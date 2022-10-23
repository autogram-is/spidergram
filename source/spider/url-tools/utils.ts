import {RequestQueue, EnqueueStrategy, RequestTransform} from 'crawlee';
import {ParsedUrl} from '@autogram/url-tools';
import {SpiderContext, CombinedContext} from '../../index.js';
import {FilterInput} from './index.js';

export async function buildEnqueueUrlOptions(
  context: CombinedContext,
  options: Partial<EnqueueUrlOptions> = {},
  internalOverrides: Partial<EnqueueUrlOptions> = {},
): Promise<EnqueueUrlOptions> {
  return {
    requestQueue: await context.crawler.getRequestQueue(),
    ...urlDiscoveryDefaultOptions,
    ...context.EnqueueUrlOptions,
    ...options,
    ...internalOverrides,
  };
}

export interface EnqueueUrlOptions {
  limit?: number;
  selector?: string;
  baseUrl?: string;
  strategy?: EnqueueStrategy;
  filter?: FilterInput;
  requestQueue?: RequestQueue;
  skipUnparsableLinks?: boolean;
  skipEmptyLinks?: boolean;
  skipAnchors?: boolean;
  label?: string;
  normalizer: UrlMutatorWithContext;
  transformRequestFunction?: RequestTransform;
}

export type UrlMutatorWithContext<T = unknown> = (
  found: ParsedUrl,
  context?: SpiderContext
) => ParsedUrl;

const urlDiscoveryDefaultOptions: Omit<EnqueueUrlOptions, 'requestQueue'> = {
  limit: Number.POSITIVE_INFINITY,
  selector: 'a',
  baseUrl: undefined,
  filter: EnqueueStrategy.SameDomain,
  skipUnparsableLinks: false,
  skipEmptyLinks: true,
  skipAnchors: true,
  label: undefined,
  normalizer: (url) => url,
  transformRequestFunction: undefined,
};

/**
 * Structured dumping ground for links found in markup; flexible enough
 * to represent both `<a>` and `<link>` tags; `context` and  `selector`
 * should be used to store information about where the link was found
 * that can't be intuited from the data/attributes/etc.
 */
export type HtmlLink = {
  href: string;
  selector?: string;
  label?: string;
  text?: string;
  attributes?: Record<string, string>;
  data?: unknown;
};
