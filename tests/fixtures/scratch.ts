import { Arango, aql } from '../../source/arango.js';
import { CheerioSpider } from '../../source/spider/cheerio/cheerio-spider.js';
import { ProcessOptions, processResources } from '../../source/analysis/index.js';
import { JsonObject } from '../../source/types.js';

// Assorted parsing helpers
import { getMeta } from '../../source/analysis/index.js';
import { htmlToText } from 'html-to-text';
import readability from 'readability-scores';

// Sheets.js setup
import * as XLSX from 'xlsx';
import * as fs from 'fs';
XLSX.set_fs(fs);
import { Readable } from 'stream';
XLSX.stream.set_readable(Readable);
import { LinkSummaries } from '../../source/reports/link-summaries.js';
import { AqlQuery } from 'arangojs/aql.js';

const targetDomain = 'example.com';
const a = new Arango();
await a.load(targetDomain.replace('.', '_'));

await crawl();
await process();
await report();

/**
 * Crawl a URL and all of its linked pages
 */
export async function crawl() {
  const spider = new CheerioSpider({
    storage: a,
    autoscaledPoolOptions: {
      maxConcurrency: 5,
      maxTasksPerMinute: 360
    }
  });
  const crawlResults = await spider.run([`https://${targetDomain}`]);
  console.log(crawlResults);
  return Promise.resolve();
}

/**
 * Iterate over the results and extract useful information
 */

export async function process() {
  const filter = aql`FILTER resource.body != null`;
  const options:ProcessOptions = {
    metadata: resource => (resource.body) ? getMeta(resource.body) : undefined,
    text: resource => (resource.body) ? htmlToText(resource.body, { 
      baseElements: { selectors: ['main'] }
    }) : undefined,
    readability: resource => (resource.text) ? readability(resource.text as string) : undefined,
  }
  const processResults = await processResources(a, filter, options);
  console.log(processResults.errors ?? 'All records processed successfully');
  return Promise.resolve();
}

/**
 * Generate a spreadsheet with some useful reports
 */
export async function report() {
  const queries: Record<string, AqlQuery> = {
    'Pages': LinkSummaries.pages(),
    'Errors': LinkSummaries.errors(),
    'Malformed URLs': LinkSummaries.malformed(),
    'Non-Web URLs': LinkSummaries.excludeProtocol(),
    'External Links': LinkSummaries.outlinks([targetDomain])
  };
  const workbook = XLSX.utils.book_new();
  for (let key in queries) {
    const cursor = await a.db.query(queries[key]);
    const result = (await cursor.all()).map(value => value as JsonObject);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(result), key);
  }
  XLSX.writeFileXLSX(workbook, `storage/${targetDomain}.xlsx`);
  console.log(`storage/${targetDomain}.xlsx generated.`);
  return Promise.resolve();
}