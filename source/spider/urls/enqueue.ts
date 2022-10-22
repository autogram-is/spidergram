import {CombinedContext} from '../context.js';
import {UrlDiscoveryOptions, buildUrlDiscoveryOptions, findUrls, saveUrls, saveRequests} from './index.js';

export async function enqueue(
  context: CombinedContext,
  customOptions: Partial<UrlDiscoveryOptions> = {},
) {
  const options = await buildUrlDiscoveryOptions(context, customOptions);
  return findUrls(context, options)
    .then(async links => saveUrls(links, context, options))
    .then(async urls => saveRequests(urls, context, options));
}
