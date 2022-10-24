
import {IncomingHttpHeaders} from 'node:http';
import {PlaywrightCrawlingContext, CheerioCrawlingContext, Request, CheerioRoot} from 'crawlee';
import {UniqueUrl, Resource} from '../model/index.js';
import {EnqueueUrlOptions, AnchorTagData} from './links/index.js';
import {SpiderOptions} from './options.js';
import { Awaitable } from 'crawlee';

export type SupportedContext = PlaywrightCrawlingContext | CheerioCrawlingContext;
export type CombinedContext = SpiderContext & SupportedContext;

export interface SpiderContext<Context extends SupportedContext = SupportedContext> extends SpiderOptions<Context> {
  // Data that's passed around during a single crawl request
  uniqueUrl?: UniqueUrl;
  resource?: Resource;
  requestMeta?: RequestMeta;
  $?: CheerioRoot;

  // Helper functions each spider implementation 'contextualizes'
  prefetchRequest: () => Promise<RequestMeta>;
  saveResource: (data?: Record<string, unknown>) => Promise<Resource>;
  enqueueLinks: (options?: EnqueueUrlOptions) => Promise<unknown>;
  findUrls: (options?: EnqueueUrlOptions) => Promise<AnchorTagData[]>;
  saveUrls: (links: AnchorTagData[], options?: EnqueueUrlOptions) => Promise<UniqueUrl[]>;
  saveRequests: (urls: UniqueUrl[], options?: EnqueueUrlOptions) => Promise<Request[]>;
}

export interface RequestMeta {
  url: string;
  redirectUrls?: URL[];
  headers: IncomingHttpHeaders;
  statusMessage?: string;
  statusCode: number;
}

export function contextualizeHook<C extends SupportedContext = SupportedContext>(hook: Function) {
  return (ctx: C, ...args: any[]): Awaitable<void> => hook(ctx as SpiderContext & C, ...args);
}

export function contextualizeHandler<C extends SupportedContext = SupportedContext>(handler: Function) {
  return (ctx: C, ...args: any[]): Awaitable<void> => handler(ctx as SpiderContext & C, ...args);
}
