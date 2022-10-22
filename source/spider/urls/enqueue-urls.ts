import { CombinedContext } from '../context.js';
import { UrlDiscoveryOptions, buildUrlDiscoveryOptions, findUrls, saveUrls, saveRequests } from './index.js';

export async function enqueueUrls(
  context: CombinedContext,
  customOptions: Partial<UrlDiscoveryOptions> = {}
) {
  const options = await buildUrlDiscoveryOptions(context, customOptions);
  return findUrls(context, options)
    .then(links => saveUrls(links, context, options))
    .then(urls => saveRequests(urls, context, options));
}