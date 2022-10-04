import {CheerioCrawler, Request} from 'crawlee';
import {getLinks} from '../../source/extractors/links.js';
import {UniqueUrl, RespondsWith, Resource, LinksTo} from '../../source/model/index.js';
import {Arango} from '../../source/arango.js';

const crawlName = 'karen';

// This song-and-dance should go into our wrapper class.
const a = new Arango();
if ((await a.systemDb.listDatabases()).includes(crawlName)) {
  a.db = a.systemDb.database(crawlName);
} else {
  a.db = await a.systemDb.createDatabase(crawlName);
}
a.initialize(); // won't harm existing data, ensures we have all our collections

// Here's our crawl handler.
(async () => {
  const crawlee = new CheerioCrawler({
    async requestHandler({crawler, request, response, $, log}) {
      // Get the UniqueUrl we've stored in the request userData
      const ru = request.userData as UniqueUrl;

      const rs = new Resource({
        url: response.url,
        code: response.statusCode,
        message: response.statusMessage,
        headers: response.headers,
        body: $.html()
      });

      const rw = new RespondsWith({
        url: ru,
        resource: rs,
        method: request.method,
        headers: request.headers ?? {}
      })

      a.add([rs, rw]);

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
        if (uu.parsable) {
          const nr = new Request({
            url: uu.url,
            uniqueKey: uu.key,
            userData: uu,
          })
          await q.addRequest(nr);
        }
      }
      a.add(foundLinks);
      log.info(`${request.url} (${response.statusCode})`);
    }
  });
  
  // Run the crawler with initial request
  const firstUrl = new UniqueUrl({ url: 'http://karenmcgrane.com' });
  a.add(firstUrl);
  
  const seedRequests = [new Request({
    url: firstUrl.url,
    uniqueKey: firstUrl.key,
    userData: firstUrl
  })];
  await crawlee.run(seedRequests);
})();
