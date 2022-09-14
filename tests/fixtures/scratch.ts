import {
  Context,
  JsonGraph,
  UniqueUrl,
  UniqueUrlSet,
  SimpleCrawler,
  CrawlProgress,
  GotFetcher,
} from '../../source/index.js';

Context.directory += '/crawl_data';

const uus = new UniqueUrlSet([
  'https://angrylittletree.com',
  'https://ethanmarcotte.com',
  'https://karenmcgrane.com',
  'https://autogram.is',
  'https://domain-that-wont-exist.biz',
]);

const graph = new JsonGraph();
graph.set([...uus.values()]);

const c = new SimpleCrawler({
  graph,
  rules: {},
});

c.on('process', (uu: UniqueUrl, progress: CrawlProgress) => {
  console.log(progress, uu.url);
});

(async () => {
  await c.crawl([...uus]);
  await graph.save(Context.path('test.ndjson'));
})();
