import {EnqueueLinksOptions, RequestQueue, EnqueueStrategy} from 'crawlee';
import {ParsedUrl, NormalizedUrl} from '@autogram/url-tools';
import {SpiderContext, CombinedContext} from '../../index.js';

export async function buildUrlDiscoveryOptions(
  context: CombinedContext,
  options: Partial<UrlDiscoveryOptions> = {},
  internalOverrides: Partial<UrlDiscoveryOptions> = {},
): Promise<UrlDiscoveryOptions> {
  return {
    requestQueue: await context.crawler.getRequestQueue(),
    ...urlDiscoveryDefaultOptions,
    ...context.urlDiscoveryOptions,
    ...options,
    ...internalOverrides,
  };
}

type SupportedEnqueueOptions = Pick<EnqueueLinksOptions,
'limit' |
'selector' |
'userData' |
'baseUrl' |
'globs' |
'regexps' |
'strategy'
>;

export interface UrlDiscoveryOptions extends SupportedEnqueueOptions {
  filters: UrlFilterWithContext[];
  requestQueue: RequestQueue;
  skipUnparsableLinks: boolean;
  skipEmptyLinks: boolean;
  skipAnchors: boolean;
  label?: string;
  normalizer: UrlMutatorWithContext;
}

export type UrlMutatorWithContext<T = unknown> = (
  found: ParsedUrl,
  context?: SpiderContext
) => ParsedUrl;

export type UrlFilterWithContext = (
  found: ParsedUrl,
  context?: SpiderContext
) => boolean;

const urlDiscoveryDefaultOptions: Omit<UrlDiscoveryOptions, 'requestQueue'> = {
  selector: 'a',
  limit: Number.POSITIVE_INFINITY,
  filters: [],
  globs: [],
  regexps: [],
  skipUnparsableLinks: false,
  skipEmptyLinks: true,
  skipAnchors: true,
  userData: {},
  baseUrl: '',
  strategy: EnqueueStrategy.SameDomain,
  normalizer: NormalizedUrl.normalizer,
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
