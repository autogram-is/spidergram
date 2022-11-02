import {buildSpiderOptions, SpiderOptions} from '../index.js';
import {PlaywrightCrawlerOptions} from 'crawlee';

export function splitOptions(
  options: Partial<SpiderOptions> = {},
) {
  const {
    projectConfig,
    defaultRouter,
    pageHandler,
    requestHandlers,
    urlOptions,
    parseMimeTypes,
    downloadMimeTypes,
    preNavigationHooks,
    postNavigationHooks,

    ...crawlerOptions
  } = options;

  return {
    spider: buildSpiderOptions(options),
    crawler: crawlerOptions as PlaywrightCrawlerOptions,
  };
}