import {Dictionary, PlaywrightCrawlerOptions} from 'crawlee';
import {helpers, ProjectConfig, projectConfigDefaults} from '../index.js';
import {SpiderHook, defaultRouter} from './hooks/index.js';
import {EnqueueUrlOptions} from './links/index.js';
import {SpiderRequestHandler} from './handlers/index.js';

export type CombinedOptions = SpiderOptions & Omit<PlaywrightCrawlerOptions, 'preNavigationHooks' | 'postNavigationHooks'>;

export interface SpiderOptions extends Dictionary {
  projectConfig: Partial<ProjectConfig>,
  requestRouter: SpiderHook;
  requestHandlers: Record<string, SpiderRequestHandler>;
  urlOptions: Partial<EnqueueUrlOptions>;
  parseMimeTypes: string[];
  downloadMimeTypes: string[];
  preNavigationHooks?: SpiderHook[]
  postNavigationHooks?: SpiderHook[]
}

export function buildSpiderOptions(
  options: Partial<SpiderOptions>,
  internaloverrides: Partial<SpiderOptions> = {},
): SpiderOptions {
  return {
    ...defaultSpiderOptions,
    ...options,
    ...internaloverrides,
  };
}

const defaultSpiderOptions: SpiderOptions = {
  projectConfig: projectConfigDefaults,
  requestRouter: defaultRouter,
  preNavigationHooks: [],
  postNavigationHooks: [],
  requestHandlers: {},
  urlOptions: {},
  parseMimeTypes: helpers.mimeGroups.page,
  downloadMimeTypes: [],
};
