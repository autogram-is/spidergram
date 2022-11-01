
import {IncomingHttpHeaders} from 'node:http';
import {PlaywrightCrawlingContext, Request, CheerioRoot} from 'crawlee';
import {Awaitable} from 'crawlee';
import {UniqueUrl, Resource} from '../model/index.js';
import {EnqueueUrlOptions, AnchorTagData} from './links/index.js';
import {SpiderOptions} from './options.js';
import {ArangoStore} from '../model/arango-store.js';
import { TDiskDriver } from 'typefs';

export type CombinedContext = SpiderContext & PlaywrightCrawlingContext;

export interface SpiderContext extends SpiderOptions {
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

  // Global services and resources
  graph: ArangoStore;
  files: TDiskDriver;
}

export interface RequestMeta {
  url: string;
  method?: string;
  redirectUrls?: URL[];
  headers: IncomingHttpHeaders;
  statusMessage?: string;
  statusCode: number;
}

export function contextualizeHook(hook: Function) {
  return (ctx: PlaywrightCrawlingContext, ...args: any[]): Awaitable<void> => hook(ctx as SpiderContext & C, ...args);
}

export function contextualizeHandler(handler: Function) {
  return (ctx: PlaywrightCrawlingContext, ...args: any[]): Awaitable<void> => handler(ctx as SpiderContext & C, ...args);
}
