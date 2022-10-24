import {ArangoStore} from '../arango-store.js';
import {helpers} from '../index.js';
import {SpiderHook, requestRouter} from './hooks/index.js';
import {SpiderRequestHandler} from './handlers/index.js';
import {EnqueueUrlOptions} from './links/index.js';
import {Dictionary, CheerioCrawlerOptions, PlaywrightCrawlerOptions} from 'crawlee';
import { SupportedContext } from '../index.js';

export type SupportedOptions = CheerioCrawlerOptions | PlaywrightCrawlerOptions;
export type CombinedOptions = SupportedOptions & SpiderOptions;

export interface SpiderOptions<Context extends SupportedContext = SupportedContext> extends Dictionary {
  storage: ArangoStore;
  requestRouter: SpiderHook<Context>;
  requestHandlers: Record<string, SpiderRequestHandler<Context>>;
  urlOptions: Partial<EnqueueUrlOptions>;
  parseMimeTypes: string[];
  downloadMimeTypes: string[];
}

export function buildSpiderOptions<Context extends SupportedContext = SupportedContext>(
  options: Partial<SpiderOptions<Context>>,
  internaloverrides: Partial<SpiderOptions<Context>> = {},
): SpiderOptions<Context> {
  return {
    ...defaultSpiderOptions,
    ...options,
    ...internaloverrides,
  };
}

const defaultSpiderOptions: SpiderOptions = {
  storage: await ArangoStore.open(),
  requestRouter: requestRouter,
  requestHandlers: {},
  urlOptions: {},
  parseMimeTypes: helpers.mimeGroups.page,
  downloadMimeTypes: helpers.mimeGroups.data,
};
