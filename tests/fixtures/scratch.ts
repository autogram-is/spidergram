import path from 'node:path';
import {
  JsonGraph,
  UniqueUrl,
  UniqueUrlSet,
  SimpleCrawler,
  Context,
  CrawlProgress,
} from '../../source/index.js';

const uus = new UniqueUrlSet([
  'https://angrylittletree.com',
  'https://ethanmarcotte.com',
  'https://karenmcgrane.com',
  'https://autogram.is'
]);
const graph = new JsonGraph();
graph.set([...uus.values()]);

const c = new SimpleCrawler();
c.on('fetch', (uu: UniqueUrl, progress: CrawlProgress) => {
  console.log(uu.url);
});
c.on('finish', console.log);

(async () => {
  await c.crawl(uus).then((entities) => {
    console.log(entities.length, 'entities returned');
    graph.set(entities);
  });
})();
