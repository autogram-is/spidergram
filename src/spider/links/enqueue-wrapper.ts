import { SpiderContext } from '../context.js';
import { EnqueueUrlOptions, find, save, enqueue } from './index.js';

export async function enqueueUrls(
  context: SpiderContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const links = find(context, customOptions);
  return save(context, links, customOptions).then(async urls =>
    enqueue(context, urls, customOptions),
  );
}
