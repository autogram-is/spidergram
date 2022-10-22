import {SupportedOptions, SpiderOptions, SupportedContext, buildSpiderOptions} from '../index.js';

export function splitOptions<CrawlerOptions extends SupportedOptions, Context extends SupportedContext>(
  options: Partial<CrawlerOptions & SpiderOptions> = {},
) {
  let {
    storage,
    requestRouter,
    requestHandlers,
    urlDiscoveryOptions,
    urlNormalizer,
    downloadMimeTypes,
    parseMimeTypes,

    ...crawlerOptions
  } = options;

  return {
    spider: buildSpiderOptions(options),
    crawler: crawlerOptions as CrawlerOptions,
  }
}