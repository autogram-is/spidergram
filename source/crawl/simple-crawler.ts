import { UniqueUrl, UniqueUrlSet, Entity } from '../graph/index.js';
import { ParsedUrl } from '../util/index.js';
import { Crawler } from './crawler.js';

export class SimpleCrawler extends Crawler {
  async crawl(urls: UniqueUrlSet): Promise<Entity[]> {
    let results: Entity[] = [];

    return new Promise((resolve) => {
      for (const url of urls.values()) {
        this.queue.add(async () => {
          await this.processUrl(url).then((entities) => {
            results = [...results, ...entities];
            this.emit('processed', url);
          });
        });
      }

      this.queue.onIdle().then(() => {
        resolve(results);
      });
    });
  }

  async processUrl(url: UniqueUrl): Promise<Entity[]> {
    const parsed = url.parsed as ParsedUrl;

    return new Promise((resolve) => {
      if (this.rules.ignore(parsed)) {
        resolve([url]);
      } else if (this.rules.fetch(parsed)) {
        this.fetcher.fetch(url).then((entities: Entity[]) => {
          resolve(entities);
        });
      } else if (this.rules.check(parsed)) {
        this.fetcher.fetch(url).then((entities: Entity[]) => {
          resolve(entities);
        });
      }
    });
  }

  async findLinks(): Promise<Entity[]> {
    return [];
  }
}
