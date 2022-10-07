import {CheerioCrawler, log} from 'crawlee';
import {UniqueUrl} from '../../source/model/index.js';
import {Arango} from '../../source/arango.js';
import { SpidergramCrawlingContext, failedRequestHandler } from '../../source/spider/index.js';
import { buildCheerioRouter } from '../../source/cheerio-router.js';
import { buildRequests } from '../../source/spider/urls/build-requests.js';

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

  await crawlee.run(buildRequests(seedUniqueUrls));
})();
