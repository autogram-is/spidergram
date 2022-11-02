import {SpiderContext} from '../context.js';
import {EnqueueUrlOptions, ensureOptions} from './index.js';
import {find, save, enqueue} from './index.js';

export async function enqueueLinks(
  context: SpiderContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await ensureOptions(context, customOptions);
  return find(context, options)
    .then(async links => save(context, links, options))
    .then(async urls => enqueue(context, urls, options));
}
