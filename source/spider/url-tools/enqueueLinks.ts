import {CombinedContext} from '../context.js';
import {EnqueueUrlOptions, buildEnqueueUrlOptions} from './index.js';
import {find, save, enqueue} from './index.js';


export async function enqueueLinks(
  context: CombinedContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await buildEnqueueUrlOptions(context, customOptions);
  return find(context, options)
    .then(async links => save(links, context, options))
    .then(async urls => enqueue(urls, context, options));
}
