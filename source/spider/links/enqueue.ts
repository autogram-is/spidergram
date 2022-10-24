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

    // Unparsable and non-web URLs can't be crawled; even if they're not
    // flagged in the URL Discovery Options, we'll toss them as we filter.
    if (!uu.parsable) continue;
    if (!['https:', 'https:'].includes(uu.parsed!.protocol.toLowerCase())) continue;
    if (!filter(context, uu, options.enqueue)) continue;

    requests.push(new Request({
      url: uu.url,
      uniqueKey: uu.key,
      userData: { fromUniqueUrl: true },
      headers: {referer: uu.referer ?? ''},
    }));
  }

  return queue.addRequests(requests);
}
