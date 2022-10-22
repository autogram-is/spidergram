
import { UniqueUrl, Resource } from '../model/index.js';
import { IncomingHttpHeaders } from 'http';
import { UrlDiscoveryOptions, HtmlLink } from './helpers/index.js';
import { PlaywrightCrawlingContext, CheerioCrawlingContext, Request, CheerioRoot } from 'crawlee';
import { SpiderOptions } from './options.js';

export type SupportedCrawlingContext = PlaywrightCrawlingContext | CheerioCrawlingContext;
export type CombinedSpiderContext = SpiderContext & SupportedCrawlingContext;

export interface SpiderContext extends SpiderOptions {
  // Data that's passed around during a single crawl request
  uniqueUrl?: UniqueUrl,
  resource?: Resource,
  requestMeta?: RequestMeta,
  $?: CheerioRoot,

  // Helper functions each spider implementation 'contextualizes'
  prefetchRequest: () => Promise<RequestMeta>,
  saveResource: (data?: Record<string, unknown>) => Promise<Resource>,
  enqueueUrls: (options?: UrlDiscoveryOptions) => Promise<unknown>,
  findUrls: (options?: UrlDiscoveryOptions) => Promise<HtmlLink[]>,
  saveUrls: (links: HtmlLink[], options?: UrlDiscoveryOptions) => Promise<UniqueUrl[]>,
  buildRequests: (urls: UniqueUrl[], options?: UrlDiscoveryOptions) => Promise<Request[]>,
}

export interface RequestMeta {
  url: string,
  redirectUrls?: URL[],
  headers: IncomingHttpHeaders,
  statusMessage?: string,
  statusCode: number,
}
