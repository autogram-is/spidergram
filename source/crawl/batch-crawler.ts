import { performance } from 'node:perf_hooks';
import PQueue from 'p-queue';
import { GraphLike, UniqueUrl, UniqueUrlSet, Entity, Resource, Status, RespondsWith } from '../graph/index.js';
import { Fetcher } from '../fetch/index.js';
import { ParsedUrl, Filter, FilterSet } from '../util/index.js';
import { Crawler } from './crawler.js';

export class BatchCrawler extends Crawler {

  async crawl(urls: UniqueUrlSet): Promise<void> {
    for (let url of urls.values()) {
      if (this.should.shouldCheck(uu.parsed!)) {
        await this.queue.add(async () => {
          await this.processUrl(uu as UniqueUrl);
        });
      }
    }
  }

  async processUrl(url: UniqueUrl): Promise<void> {
    const toSave: Entity[] = [url];
    const parsed = url.parsed as ParsedUrl;
    const rules = this.config.rules;

    const timer = performance.now();

    if (// shouldIgnore ) {

    } else {
      const result = await this.fetcher.fetch(
        url,
        rules.urlFilters.shouldRetrieve(parsed)
      );

      if (
        response instanceof Resource &&
        rules.urlFilters.shouldFollow(parsed)
      ) {
        toSave.push(...this.findNewLinks(response, url.depth + 1));
      }
    }

    url.in_queue = 0;
    this.graph.set(toSave);

    this.emit('processed', url, performance.now() - timer);
  }

  protected findNewLinks(resource: Resource, depth = 0): Entity[] {
    const result: Entity[] = [];

    let links: ExtractedLink[] = [];
    for (const key in this.config.rules.linkSelectors) {
      links = this.config.rules.linkSelectors[key](resource);
      links.forEach(l => {
        l.context = key;
        const uu = UniqueUrl.new(l.href, resource.url, depth, resource.url);
        // No self-links, no links on the explicit ignore list.
        if (
          uu.url !== resource.url &&
          (!uu.parsable ||
            !this.config.rules.urlFilters.shouldIgnore(uu.parsed!))
        ) {
          result.push(resource.linkTo(uu, l.href, l));
          if (!Spidergram.touchedIds.has(uu.id)) {
            Spidergram.touchedIds.add(uu.id);
            result.push(uu);
          }
        }
      });
    }
    return result;
  }

  start() {
    if (this.queue.isPaused) {
      this.queue.start();
      this.emit('started', this.status);
    }
  }

  pause() {
    if (!this.queue.isPaused) {
      this.queue.pause();
      this.emit('paused', this.status);
    }
  }
}
