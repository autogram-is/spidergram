import {CheerioCrawler, Request} from 'crawlee';
import {getLinks} from '../../source/extractors/links.js';
import {UniqueUrl, RespondsWith, Resource, LinksTo} from '../../source/model/index.js';
import {Arango} from '../../source/arango.js';
import { NormalizedUrl, UrlFilters } from '@autogram/url-tools';
import { getMeta } from '../../source/index.js';

const crawlName = 'test';

// This song-and-dance should go into our wrapper class.
const a = new Arango();
if ((await a.systemDb.listDatabases()).includes(crawlName)) {
  a.db = a.systemDb.database(crawlName);
} else {
  a.db = await a.systemDb.createDatabase(crawlName);
  await a.initialize(); // won't harm existing data, ensures we have all our collections
}

// Here's our crawl handler.
(async () => {
  const crawlee = new CheerioCrawler({
    async requestHandler({crawler, request, response, $, log}) {
      // Get the UniqueUrl we've stored in the request userData
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
      log.info(`${request.url} (Response: ${response.statusCode}) (Links: ${foundLinks.length/2})`);
    }
  });
  
  // Run the crawler with initial request
  const firstUrl = new UniqueUrl({ url: 'https://autogram.is' });
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