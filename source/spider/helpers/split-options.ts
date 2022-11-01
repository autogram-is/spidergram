import {buildSpiderOptions, CombinedOptions} from '../index.js';

export function splitOptions(
  options: Partial<CombinedOptions> = {},
) {
  const {
    projectConfig,
    requestRouter,
    requestHandler,
    requestHandlers,
    urlOptions,
    parseMimeTypes,
    downloadMimeTypes,

    ...crawlerOptions
  } = options;

  return {
    spider: buildSpiderOptions(options),
    crawler: crawlerOptions as CombinedOptions,
  };
}