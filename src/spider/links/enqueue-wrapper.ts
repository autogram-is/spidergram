import { SpiderContext } from '../context.js';
import {
  UrlDiscoveryOptions,
  findUrls,
  saveUrls,
  enqueueRequests,
} from './index.js';

export async function enqueueUrls(
  context: SpiderContext,
  customOptions: UrlDiscoveryOptions = {},
) {
  const links = findUrls(context, customOptions);
  return saveUrls(context, links, customOptions).then(async urls =>
    enqueueRequests(context, urls, customOptions),
  );
}
