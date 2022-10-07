import { Arango, aql } from '../../source/arango.js';
import { CheerioSpider } from '../../source/spider/cheerio/cheerio-spider.js';
import { ProcessOptions, processResources } from '../../source/analysis/index.js';

import { getMeta } from '../../source/analysis/index.js';
import { htmlToText } from 'html-to-text';
import readability from 'readability-scores';

// Set up the Arango connection
const a = new Arango();
await a.load('example');

// Create the spider instance with our settings
const spider = new CheerioSpider({
  storage: a,
  autoscaledPoolOptions: {
    maxConcurrency: 5,
    maxTasksPerMinute: 240
  }
});

// Populate the initial URL list and run the crawl
console.log(await spider.run(['https://uscis.gov']));

// Now loop over the results we saved and extract more data
const filter = aql`FILTER resource.body != null`;

const options:ProcessOptions = {
  metadata: resource => (resource.body) ? getMeta(resource.body) : undefined,
  text: resource => (resource.body) ? htmlToText(resource.body) : undefined,
  readability: resource => (resource.text) ? readability(resource.text as string) : undefined,
}

console.log(await processResources(a, filter, options));
