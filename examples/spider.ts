import { Arango } from '../source/arango-store.js';
import { CheerioSpider } from '../source/spider/cheerio/cheerio-spider.js';

// Set up the crawl context
const a = new Arango();
await a.load('example');

const spider = new CheerioSpider({
  storage: a,
  autoscaledPoolOptions: {
    maxConcurrency: 1,
    maxTasksPerMinute: 120
  }
});

// Populate the initial URL list
const results = await spider.run(['http://example.com']);

console.log(results);
