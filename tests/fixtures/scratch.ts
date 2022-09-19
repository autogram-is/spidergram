import { metadataFromResource } from '../../source/extract/metadata-from-resource.js';

import {
  Context,
  JsonGraph,
  UniqueUrl,
  UniqueUrlSet,
  SimpleCrawler,
  CrawlProgress,
  GotFetcher,
  where,
  isResource
} from '../../source/index.js';

Context.directory += '/crawl_data';

const uus = new UniqueUrlSet([
  'https://angrylittletree.com',
  'https://ethanmarcotte.com',
  'https://karenmcgrane.com',
  'https://autogram.is',
  'https://domain-that-wont-exist.biz',
]);

const targetHosts = new Set<string>();
for (let uu of uus) {
  if (uu.parsed) targetHosts.add(uu.parsed.domain)
}

const graph = new JsonGraph();
graph.set([...uus]);

const c = new SimpleCrawler({ graph, queue: { intervalCap: 10 } });
c.rules.follow = url => targetHosts.has(url.domain);

c.on('process', (uu: UniqueUrl, progress: CrawlProgress) => {
  console.log(progress, uu.url);
});

(async () => {
  await c.crawl([...uus]);

  const resources = graph.nodes(
    where('type', { eq: 'resource' }),
    where('title', { exists: false })
  );
  
  for (let resource of resources) {
    if (isResource(resource)) {
      const meta = metadataFromResource(resource);
      for (let k in meta) {
        resource[k] = meta[k];
      }
      graph.set(resource);
    }
  }  

  await graph.save(Context.path('test-crawl.ndjson'));
})();

