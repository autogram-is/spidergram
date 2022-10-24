import {CombinedContext} from '../context.js';
import {EnqueueUrlOptions, ensureOptions} from './index.js';
import {find, save, enqueue} from './index.js';

export async function enqueueLinks(
  context: CombinedContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await ensureOptions(context, customOptions);
  return find(context, options)
    .then(links => save(context, links, options))
    .then(urls => enqueue(context, urls, options));
}
