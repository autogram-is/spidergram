import arrify from 'arrify';
import { Request, RequestOptions } from 'crawlee';
import { UniqueUrl } from '../../model/index.js';
import { SpiderContext } from '../context.js';
import { Robots } from '../../tools/html/robots.js';
import {
  EnqueueUrlOptions,
  urlDiscoveryDefaultOptions,
  filterUrls,
} from './index.js';
import _ from 'lodash';

export async function enqueueRequests(
  context: SpiderContext,
  urls: UniqueUrl | UniqueUrl[],
  customOptions: Partial<EnqueueUrlOptions> = {},
  requestOptions: Partial<RequestOptions> = {},
) {
  const options: EnqueueUrlOptions = _.defaultsDeep(
    customOptions,
    context.urlOptions,
    urlDiscoveryDefaultOptions,
  );
  const input = arrify(urls);
  const queue =
    options.requestQueue ?? (await context.crawler.getRequestQueue());
  const requests: Request[] = [];
  for (const uu of input) {
    // Unparsable and non-web URLs can't be crawled; even if they're not
    // flagged in the URL Discovery Options, we'll toss them as we filter.
    if (!uu.parsable) {
      continue;
    }

    if (
      !['https:', 'https:'].includes(uu.parsed?.protocol.toLowerCase() ?? '')
    ) {
      continue;
    }

    if (!filterUrls(context, uu, options.enqueue)) {
      continue;
    }

    if (Robots.isDisallowed(uu.url, context.userAgent)) {
      continue;
    }

    if (uu.forefrontRequest) {
      await queue.addRequests([uniqueUrlToRequest(uu, requestOptions)], {
        forefront: true,
      });
    } else {
      requests.push(uniqueUrlToRequest(uu, requestOptions, options));
    }
  }

  return queue.addRequests(requests.slice(0, options.limit), {
    forefront: options.prioritize,
  });
}

export function uniqueUrlToRequest(
  uu: UniqueUrl,
  options: Partial<RequestOptions> = {},
  contextOptions: Partial<EnqueueUrlOptions> = {},
): Request {
  const r = new Request<
    Partial<UniqueUrl & { fromUniqueUrl?: boolean; handler?: string }>
  >({
    ...options,
    url: uu.url,
    uniqueKey: uu.key,
    label:
      options.label ??
      contextOptions.handler ??
      (uu.handler ? (uu.handler as string) : undefined),
  });
  if (uu.referer) r.userData.referer = uu.referer;
  if (uu.depth > 0) r.userData.depth = uu.depth;
  r.userData.fromUniqueUrl = true;

  return r;
}
