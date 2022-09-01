import { Entity, UniqueUrl, UniqueUrlSet, SimpleCrawler } from '../../source/index.js';

const uus = new UniqueUrlSet(['https://example.com']);

const c = new SimpleCrawler()
  .once('finish', (progress: Record<string, number>) => {})

c.crawl(uus).then(entities => {
  for(let e of entities) {
    console.log(e);
  }
});