import { CheerioCrawler } from 'crawlee';

import { UniqueUrl } from '../source/model/index.js';
import { Arango } from '../source/arango.js';
import { SpidergramCrawlingContext, failedRequestHandler } from '../source/spider/index.js';
import { buildCheerioRouter } from '../source/cheerio-router.js';
import { buildRequests } from '../source/spider/urls/build-requests.js';

// Set up the crawl context
const spidergram: SpidergramCrawlingContext = { storage: new Arango() };
await spidergram.storage.load('example');

// Populate the initial URL list
const seedUrls = ['http://autogram.is'];
const seedUniqueUrls = seedUrls.map(u => new UniqueUrl({ url: u }));

// Initialize a CheerioCrawler...
(async () => {
  const crawlee = new CheerioCrawler({
    autoscaledPoolOptions: {
      maxTasksPerMinute: 240,
      maxConcurrency: 1,
    },
    requestHandler: buildCheerioRouter(spidergram),
    failedRequestHandler: (context, error) => {
      failedRequestHandler(context.request, context.response, error, spidergram);
    }
  });
  
  await spidergram.storage.add(seedUniqueUrls);
  
  console.log(await crawlee.run(buildRequests(seedUniqueUrls)));
})();
