import {CombinedContext} from '../context.js';
import {EnqueueUrlOptions, buildEnqueueUrlOptions, findUrls, saveUrls, saveRequests} from './index.js';

export async function enqueue(
  context: CombinedContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await buildEnqueueUrlOptions(context, customOptions);
  return findUrls(context, options)
    .then(async links => saveUrls(links, context, options))
    .then(async urls => saveRequests(urls, context, options));
}
