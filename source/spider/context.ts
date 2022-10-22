
import {IncomingHttpHeaders} from 'node:http';
import {PlaywrightCrawlingContext, CheerioCrawlingContext, Request, CheerioRoot} from 'crawlee';
import {UniqueUrl, Resource} from '../model/index.js';
import {UrlDiscoveryOptions, HtmlLink} from './urls/index.js';
import {SpiderOptions} from './options.js';

export type SupportedContext = PlaywrightCrawlingContext | CheerioCrawlingContext;
export type CombinedContext = SpiderContext & SupportedContext;

export interface SpiderContext extends SpiderOptions {
  // Data that's passed around during a single crawl request
  uniqueUrl?: UniqueUrl;
  resource?: Resource;
  requestMeta?: RequestMeta;
  $?: CheerioRoot;

  // Helper functions each spider implementation 'contextualizes'
  prefetchRequest: () => Promise<RequestMeta>;
  saveResource: (data?: Record<string, unknown>) => Promise<Resource>;
  enqueueLinks: (options?: UrlDiscoveryOptions) => Promise<unknown>;
  findUrls: (options?: UrlDiscoveryOptions) => Promise<HtmlLink[]>;
  saveUrls: (links: HtmlLink[], options?: UrlDiscoveryOptions) => Promise<UniqueUrl[]>;
  saveRequests: (urls: UniqueUrl[], options?: UrlDiscoveryOptions) => Promise<Request[]>;
}

export interface RequestMeta {
  url: string;
  redirectUrls?: URL[];
  headers: IncomingHttpHeaders;
  statusMessage?: string;
  statusCode: number;
}
