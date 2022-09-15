import { CrawlHelpers } from '../../source/crawl/index.js';
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
const targetHosts = CrawlHelpers.getUniqueHosts([...uus]);
const graph = new JsonGraph();
graph.set([...uus]);

const c = new SimpleCrawler({
  graph,
  rules: {
    isTarget: url => targetHosts.includes(url.hostname),
    follow: url => targetHosts.includes(url.hostname)
  },
});

c.on('process', (uu: UniqueUrl, progress: CrawlProgress) => {
  console.log(progress, uu.url);
});

(async () => {
  await c.crawl([...uus]);
  await graph.save(Context.path('test.ndjson'));
})();
