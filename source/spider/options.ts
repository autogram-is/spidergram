import {Dictionary, CheerioCrawlerOptions, PlaywrightCrawlerOptions} from 'crawlee';
import {Project, SupportedContext, helpers} from '../index.js';
import {SpiderHook, requestRouter} from './hooks/index.js';
import {EnqueueUrlOptions} from './links/index.js';
import {SpiderRequestHandler} from './handlers/index.js';

export type SupportedOptions = CheerioCrawlerOptions | PlaywrightCrawlerOptions;
export type CombinedOptions = SupportedOptions & SpiderOptions;

export interface SpiderOptions<Context extends SupportedContext = SupportedContext> extends Dictionary {
  project: Project;
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
  project: await Project.context(),
  requestRouter,
  requestHandlers: {},
  urlOptions: {},
  parseMimeTypes: helpers.mimeGroups.page,
  downloadMimeTypes: [
    ...helpers.mimeGroups.data,
    ...helpers.mimeGroups.document,
    ...helpers.mimeGroups.spreadsheet,
    ...helpers.mimeGroups.pdf,
  ],
};
