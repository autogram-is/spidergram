import is from '@sindresorhus/is';
import {Request} from 'crawlee';
import {UniqueUrl} from '../../model/index.js';
import {CombinedContext} from '../context.js';
import {EnqueueUrlOptions, ensureOptions, filter} from './index.js';

export async function enqueue(
  context: CombinedContext,
  urls: UniqueUrl | UniqueUrl[],
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await ensureOptions(context, customOptions);
  const input = is.array(urls) ? urls : [urls];

  const queue = options.requestQueue ?? await context.crawler.getRequestQueue();
  const requests: Request[] = [];
  for (const uu of input) {
    if (uu.parsable && filter(context, uu, options.enqueue)) {

      if ()

      requests.push(new Request({
        url: uu.url,
        uniqueKey: uu.key,
        userData: { fromUniqueUrl: true },
        headers: {referer: uu.referer ?? ''},
      }));
    }
  }

  return queue.addRequests(requests);
}
