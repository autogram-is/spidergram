import { metadataFromResource } from '../../source/extract/metadata.js';
import { statsFromMarkup } from '../../source/extract/markup-stats.js';

import {
  Context,
  JsonGraph,
  UniqueUrl,
  UniqueUrlSet,
  SimpleCrawler,
  CrawlProgress,
  where,
  isResource
} from '../../source/index.js';

Context.directory += '/crawl_data';

const uus = new UniqueUrlSet([
  'https://karenmcgrane.com',
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

  console.log('Content crawled!')

  const resources = graph.nodes(
    where('type', { eq: 'resource' }),
    where('title', { exists: false })
  );
  
  for (let resource of resources) {
    if (isResource(resource)) {
      resource.meta = metadataFromResource(resource);
      resource.markupStats = statsFromMarkup(resource);
      graph.set(resource);
    }
    console.log('====')
    console.log(resource.meta)
    console.log(resource.markupStats)
  }

  await graph.save(Context.path('karenmcgrane.ndjson'));
})();

