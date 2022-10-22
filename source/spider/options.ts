import { ParsedUrl, UrlMutators } from '@autogram/url-tools';
import { ArangoStore } from '../arango-store.js';
import { UrlDiscoveryOptions } from './helpers/index.js';
import { SpiderContext } from './context.js';
import { SpiderHook, requestRouter} from './hooks/index.js';
import { SpiderRequestHandler } from './handlers/handler.js';

export interface SpiderOptions extends Record<string, unknown> {
  storage: ArangoStore,
  requestRouter: SpiderHook,
  requestHandlers: Record<string, SpiderRequestHandler>,
  urlDiscoveryOptions: Partial<UrlDiscoveryOptions>,
  urlNormalizer: UrlMutatorWithContext,
}

export function buildSpiderOptions(
  options: Partial<SpiderOptions>,
  internalOverides: Partial<SpiderOptions> = {}
): SpiderOptions {
  return {
    ...defaultSpiderOptions,
    ...options,
    ...internalOverides
  };
}

const defaultSpiderOptions: SpiderOptions = {
  storage: await ArangoStore.open(),
  requestRouter: requestRouter,
  requestHandlers: {},
  urlDiscoveryOptions: {},
  urlNormalizer: url => UrlMutators.defaultNormalizer(url),
}

export type UrlMutatorWithContext<T = unknown> = (
  found: ParsedUrl,
  context?: SpiderContext
) => ParsedUrl;

export type UrlFilterWithContext = (
  found: ParsedUrl,
  context?: SpiderContext
) => boolean;