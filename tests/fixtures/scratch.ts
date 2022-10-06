import {CheerioCrawler, Request, log} from 'crawlee';
import {getLinks} from '../../source/extractors/links.js';
import {UniqueUrl, RespondsWith, Resource, LinksTo} from '../../source/model/index.js';
import {Arango} from '../../source/arango.js';
import { NormalizedUrl, UrlFilters } from '@autogram/url-tools';
import { getMeta } from '../../source/index.js';

const crawlName = 'ethan1';
const a = new Arango();
await a.load(crawlName);

log.setLevel(log.LEVELS.ERROR);

// Here's our crawl handler.
(async () => {
  const crawlee = new CheerioCrawler({
    autoscaledPoolOptions: {
      maxTasksPerMinute: 120,
      maxConcurrency: 5,
    },
    async requestHandler(context) {
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

      await a.add([rs, rw]);

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
      await a.add(foundLinks);
      console.log(`${request.url} (Response: ${response.statusCode}) (Links: ${foundLinks.length/2})`);
    },
    failedRequestHandler(context, error) {
      const { request, response } = context;
      const ru = UniqueUrl.fromJSON(request.userData);

      const rs = new Resource({
        url: request.loadedUrl ?? request.url,
        code: response.statusCode ?? -1,
        message: response.statusMessage ?? error.message,
        headers: response.headers ?? {}
      });

      const rw = new RespondsWith({
        url: ru,
        resource: rs,
        method: request.method,
        headers: request.headers ?? {}
      })

      a.add([ru, rw]);
      console.log(`${request.url} (Response: ${response.statusCode})`);
    },
  });
  
  // Run the crawler with initial request
  const firstUrl = new UniqueUrl({ url: 'https://ethanmarcotte.com' });
  await a.add(firstUrl);
  
  const seedRequests = [new Request({
    url: firstUrl.url,
    uniqueKey: firstUrl.key,
    userData: firstUrl.toJSON()
  })];
  await crawlee.run(seedRequests);
})();

function shouldCrawl(currentUrl: UniqueUrl, foundUrl: NormalizedUrl): boolean {
  return (
    (currentUrl.parsed!.hostname === foundUrl.hostname) &&
    UrlFilters.isWebProtocol(foundUrl)
  );
}