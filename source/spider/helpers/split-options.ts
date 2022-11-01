import {buildSpiderOptions, CombinedOptions} from '../index.js';
import {PlaywrightCrawlerOptions} from 'crawlee';

export function splitOptions(
  options: Partial<CombinedOptions> = {},
) {
  const {
    projectConfig,
    defaultRouter,
    requestHandler,
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