import {SpiderContext} from '../context.js';
import {EnqueueUrlOptions, ensureOptions, find, save, enqueue} from './index.js';

export async function enqueueUrls(
  context: SpiderContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await ensureOptions(context, customOptions);
  return find(context, options)
    .then(async links => save(context, links, options))
    .then(async urls => enqueue(context, urls, options));
}
