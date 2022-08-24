import { Pipeline, Graph, Crawl, Fetch, Util } from '../../source/index.js';
import { gotScraping, Response } from 'got-scraping';
import { BROWSER_PRESETS } from '../../source/fetch/index.js';

const url = new Graph.UniqueUrl('https://example.com');
const headers: Graph.HeaderShape = {
  referer: 'https://google.com',
}

const f = new Fetch.GotFetcher();
f.check(url).then((es: Graph.Entity[]) => console.log(es));

/**
const s = gotScraping.head(url, options).then((value: Response<string>) => {
  console.log(value.url);
  console.log(value.statusCode);
  console.log(value.headers);
});
**/