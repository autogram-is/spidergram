import { Arango } from '../../source/arango.js';
import { CheerioSpider } from '../../source/spider/cheerio/cheerio-spider.js';

// Set up the crawl context
const a = new Arango();
await a.load('example');

const spider = new CheerioSpider({ storage: a });

// Populate the initial URL list
const results = await spider.run(['http://autogram.is']);

console.log(results);
