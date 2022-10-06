import {CheerioCrawler, Request, log} from 'crawlee';
import {UniqueUrl} from '../../source/model/index.js';
import {Arango} from '../../source/arango.js';
import { SpidergramCrawlingContext } from '../../source/spider/context.js';
import { failedRequestHandler } from '../../source/failure-handler.js';
import { buildCheerioRouter } from '../../source/cheerio-router.js';

const crawlName = 'karen';
const seedUrls = ['http://karenmcgrane.com'];

const a = new Arango();
await a.load(crawlName);

log.setLevel(log.LEVELS.ERROR);

const spidergram: SpidergramCrawlingContext = {
  storage: a,
};

// Here's our crawl handler.
(async () => {
  const crawlee = new CheerioCrawler({
    autoscaledPoolOptions: {
      maxTasksPerMinute: 240,
      maxConcurrency: 1,
    },
    requestHandler: buildCheerioRouter(spidergram),
    async failedRequestHandler(context, error) {
      await failedRequestHandler(context.request, context.response, error, spidergram);
    },
  });
  
  // Run the crawler with initial request
  const seedUniqueUrls = seedUrls.map(u => new UniqueUrl({ url: u }));
  await a.add(seedUniqueUrls);

  const seedRequests = seedUniqueUrls
    .filter(uu => uu.parsable)
    .map(uu => new Request({
      url: uu.url,
      uniqueKey: uu.key,
      userData: uu.toJSON()
    }));
  
  await crawlee.run(seedRequests);
})();
