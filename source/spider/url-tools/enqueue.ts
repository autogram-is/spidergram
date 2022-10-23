import {Request} from 'crawlee';
import {UniqueUrl} from '../../model/index.js';
import {CombinedContext} from '../context.js';
import {EnqueueUrlOptions, buildEnqueueUrlOptions} from './index.js';

export async function enqueue(
  urls: UniqueUrl[],
  context: CombinedContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await buildEnqueueUrlOptions(context, customOptions);
  const queue = options.requestQueue ?? await context.crawler.getRequestQueue();
  const requests: Request[] = [];
  for (const uu of urls) {
    if (uu.parsable) {
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
