import { getMeta } from '../../source/extract/metadata.js';
import { getLinks } from '../../source/extract/links.js';
import * as cheerio from 'cheerio';
import { CheerioCrawler, KeyValueStore } from 'crawlee';

const crawler = new CheerioCrawler({
  async requestHandler({ crawler, request, response, log, enqueueLinks }) {
    log.info(`${request.url} crawled`);
  },
  failedRequestHandler({ crawler, request, response, log }) {
    log.debug(`${request.url}: ${response.statusMessage}`);
  },
  maxConcurrency: 10,
  maxRequestsPerMinute: 600,
});

// Run the crawler with initial request
await crawler.run(['https://karenmcgrane.com']);