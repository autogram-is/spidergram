import { NormalizedUrl } from "@autogram/url-tools";
import { EnqueueLinksOptions, EnqueueStrategy, RequestQueue } from "crawlee";
import { UrlFilterWithContext, UrlMutatorWithContext } from "../options.js";
import { CombinedSpiderContext } from '../context.js';
import * as helpers from './index.js';

export async function enqueueUrls(
  context: CombinedSpiderContext,
  customOptions: Partial<UrlDiscoveryOptions> = {}
) {
  const options = await buildUrlDiscoveryOptions(context, customOptions);
  return helpers.findUrls(context, options)
    .then(links => helpers.saveUrls(links, context, options))
    .then(urls => helpers.saveRequests(urls, context, options));
}

type SupportedCrawleeOptions = Pick<EnqueueLinksOptions,
  'limit' |
  'selector' |
  'userData' |
  'baseUrl' |
  'globs' |
  'regexps' |
  'strategy'
>;

export interface UrlDiscoveryOptions extends SupportedCrawleeOptions {
  filters: UrlFilterWithContext[],
  requestQueue: RequestQueue,
  skipUnparsableLinks: boolean,
  skipEmptyLinks: boolean,
  skipAnchors: boolean,
  label?: string,
  normalizer: UrlMutatorWithContext,
}

export async function buildUrlDiscoveryOptions(
  context: CombinedSpiderContext,
  options: Partial<UrlDiscoveryOptions> = {},
  internalOverrides: Partial<UrlDiscoveryOptions> = {},
): Promise<UrlDiscoveryOptions> {
  return {
    requestQueue: await context.crawler.getRequestQueue(),
    ...urlDiscoveryDefaultOptions,
    ...context.urlDiscoveryOptions ?? {},
    ...options,
    ...internalOverrides,
  }
}

const urlDiscoveryDefaultOptions: Omit<UrlDiscoveryOptions, 'requestQueue'> = {
  selector: 'a',
  limit: Infinity,
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
}