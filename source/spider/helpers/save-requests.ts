import { UniqueUrl } from "../../model/index.js";
import { Request } from 'crawlee';
import { CombinedSpiderContext } from '../context.js';
import { UrlDiscoveryOptions, buildUrlDiscoveryOptions } from "./enqueue-urls.js";

export async function saveRequests (
  urls: UniqueUrl[],
  context: CombinedSpiderContext,
  customOptions: Partial<UrlDiscoveryOptions> = {},
) {
  const options = await buildUrlDiscoveryOptions(context, customOptions);

  const requests: Request[] = [];
  for (let uu of urls) {
    if (uu.parsable) {
      requests.push(new Request({
        url: uu.url,
        uniqueKey: uu.key,
        userData: {
          fromUniqueUrl: true,
          ...options.userData,
        },
        headers: { referer: uu.referer ?? '' }
      }));
    }
  }

  return options.requestQueue.addRequests(requests);
}
