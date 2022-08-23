import { UniqueUrl, UniqueUrlSet, Entity } from '../graph/index.js';
import { ParsedUrl } from '../util/index.js';
import { Crawler } from './crawler.js';

export class SimpleCrawler extends Crawler {
  async crawl(urls: UniqueUrlSet): Promise<Entity[]> {
    const results: Entity[] = [];

    return new Promise((resolve) => {
      for (let url of urls.values()) {
        this.queue.add(async () => {
          this.processUrl(url as UniqueUrl).then((entities) => {
            results.concat(entities);
            this.emit('processed', url);
          })
        });
      }
  
      this.queue.onIdle().then(() => {
        resolve(results);
      })
    });
  }
  
  async processUrl(url: UniqueUrl): Promise<Entity[]> {
    const parsed = url.parsed as ParsedUrl;

    return new Promise((resolve) => {
      if (this.should.ignore(parsed)) {
        resolve([url]);
      } else if (this.should.fetch(parsed)) {
        this.fetcher.fetch(url).then(entities => {
          resolve(entities);
        });
      } else if (this.should.check(parsed)) {
        this.fetcher.check(url).then(entities => {
          resolve(entities);
        });
      }
    });
  }

  async findLinks(): Promise<Entity[]> {
    return [];
  }
}
