import {SupportedOptions, SpiderOptions, SupportedContext, buildSpiderOptions} from '../index.js';

export function splitOptions<CrawlerOptions extends SupportedOptions, Context extends SupportedContext>(
  options: Partial<CrawlerOptions & SpiderOptions> = {},
) {
  const {
    storage,
    requestRouter,
    requestHandlers,
    urlOptions,
    parseMimeTypes,
    downloadMimeTypes,

    ...crawlerOptions
  } = options;

  return {
    spider: buildSpiderOptions(options),
    crawler: crawlerOptions as CrawlerOptions,
  };
}