import {Dictionary, PlaywrightCrawlerOptions} from 'crawlee';
import {helpers, ProjectConfig, projectConfigDefaults} from '../index.js';
import {SpiderHook, requestRouter} from './hooks/index.js';
import {EnqueueUrlOptions} from './links/index.js';
import {SpiderRequestHandler} from './handlers/index.js';

export type CombinedOptions = PlaywrightCrawlerOptions & SpiderOptions;

export interface SpiderOptions extends Dictionary {
  projectConfig: Partial<ProjectConfig>,
  requestRouter: SpiderHook;
  requestHandlers: Record<string, SpiderRequestHandler>;
  urlOptions: Partial<EnqueueUrlOptions>;
  parseMimeTypes: string[];
  downloadMimeTypes: string[];
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
  requestRouter,
  requestHandlers: {},
  urlOptions: {},
  parseMimeTypes: helpers.mimeGroups.page,
  downloadMimeTypes: [],
};
