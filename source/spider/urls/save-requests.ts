import {Request} from 'crawlee';
import {UniqueUrl} from '../../model/index.js';
import {CombinedContext} from '../context.js';
import {UrlDiscoveryOptions, buildUrlDiscoveryOptions} from './index.js';

export async function saveRequests(
  urls: UniqueUrl[],
  context: CombinedContext,
  customOptions: Partial<UrlDiscoveryOptions> = {},
) {
  const options = await buildUrlDiscoveryOptions(context, customOptions);

  const requests: Request[] = [];
  for (const uu of urls) {
    if (uu.parsable) {
      requests.push(new Request({
        url: uu.url,
        uniqueKey: uu.key,
        userData: {
          fromUniqueUrl: true,
          ...options.userData,
        },
        headers: {referer: uu.referer ?? ''},
      }));
    }
  }

  return options.requestQueue.addRequests(requests);
}
