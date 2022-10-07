import { CheerioCrawlingContext, createCheerioRouter, Request } from "crawlee";
import { NormalizedUrl, UrlFilters } from "@autogram/url-tools";

import { SpidergramCrawlingContext } from "./spider/index.js";
import { UniqueUrl, RespondsWith, Resource, LinksTo } from './model/index.js';
import { getLinks, getMeta } from './analysis/index.js';

export function buildCheerioRouter(spidergram: SpidergramCrawlingContext) {
  const router = createCheerioRouter();
  router.addDefaultHandler(async (context) => cheerioDefaultHandler(context, spidergram));
  return router;
}

export async function cheerioDefaultHandler(context: CheerioCrawlingContext, spidergram: SpidergramCrawlingContext): Promise<void> {
  const {crawler, request, response, $ } = context;
  const ru = UniqueUrl.fromJSON(request.userData);

  const rs = new Resource({
    url: response.url,
    code: response.statusCode,
    message: response.statusMessage,
    headers: response.headers,
    body: $.html(),
    metadata: getMeta($)
  });

  const rw = new RespondsWith({
    url: ru,
    resource: rs,
    method: request.method,
    headers: request.headers ?? {}
  })

  await spidergram.storage.add([rs, rw]);

  const q = await crawler.getRequestQueue();
  const foundLinks: (UniqueUrl | LinksTo)[] = [];
  for (let link of getLinks($)) {
    const uu = new UniqueUrl({
      url: link.href,
      base: response.url,
      referer: response.url,
      depth: ru.depth + 1,
    });
    const lt = new LinksTo({
      url: uu,
      resource: rs,
      ...link
    });
    foundLinks.push(uu, lt);

    // if the url qualifies for continued crawling
    if (uu.parsable && shouldCrawl(ru, uu.parsed!)) {
      const nr = new Request({
        url: uu.url,
        uniqueKey: uu.key,
        userData: uu.toJSON(),
      })
      await q.addRequest(nr);
    }
  }
  await spidergram.storage.add(foundLinks);
  console.log(`${request.url} (Response: ${response.statusCode}) (Links: ${foundLinks.length/2})`);
}

function shouldCrawl(currentUrl: UniqueUrl, foundUrl: NormalizedUrl): boolean {
  return (
    (currentUrl.parsed!.hostname === foundUrl.hostname) &&
    UrlFilters.isWebProtocol(foundUrl)
  );
}