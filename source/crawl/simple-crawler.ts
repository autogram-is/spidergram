import { EventEmitter } from 'node:events';
import is from '@sindresorhus/is';
import { ParsedUrl, NormalizedUrl } from '@autogram/url-tools';
import PQueue from 'p-queue';
import { INTERVALS } from '../index.js';
import {
  Entity,
  Resource,
  isResource,
  LinksTo,
  UniqueUrlSet,
  UniqueUrl,
  JsonGraph,
  isUniqueUrl,
} from '../graph/index.js';
import { Fetcher, GotFetcher } from '../fetch/index.js';
import { isHtml, isSitemap } from '../fetch/response-filters.js';
import { linksFromHtml, HtmlLink } from '../extract/links.js';
import { linksFromSitemap, SitemapLink } from '../extract/sitemap-links.js';
import { Extractor } from '../util/types.js';
import { Crawler, CrawlOptions, GraphHandle } from './crawler.js';

export interface SimpleCrawlOptions extends CrawlOptions {
  graph?: GraphHandle;
  fetcher?: Fetcher;
  extractor?: Extractor<Resource, HtmlLink[] | SitemapLink[]>;
  queue?: ConcurrencyOptions;
}
export interface ConcurrencyOptions {
  concurrency?: number;
  interval?: number;
  intervalCap?: number;
  timeout?: number;
  autoStart?: boolean;
}

const concurrencyDefaults: ConcurrencyOptions = {
  concurrency: 20,
  interval: INTERVALS.second,
  intervalCap: 5,
  timeout: INTERVALS.minute * 3,
  autoStart: true,
};
export class SimpleCrawler extends EventEmitter implements Crawler {
  graph: GraphHandle;
  fetcher: Fetcher;
  queue: PQueue;
  seen: UniqueUrlSet;

  rules = {
    isTarget: (url: ParsedUrl) => true,
    parse: (url: ParsedUrl) => true,
    follow: (url: ParsedUrl) => false,
    ignore: (url: ParsedUrl) => false,
  };

  progress = {
    total: 0,
    fetched: 0,
    found: 0,
    skipped: 0,
    errors: 0,
  };

  constructor(options: SimpleCrawlOptions = {}) {
    super();
    this.fetcher = options.fetcher ?? new GotFetcher();
    this.graph = options.graph ?? new JsonGraph();
    this.queue = new PQueue({ ...concurrencyDefaults, ...options.queue });
    this.rules = {
      ...this.rules,
      ...options.rules,
    };
    this.seen = new UniqueUrlSet();
  }

  eventNames(): string[] {
    return ['start', 'process', 'fail'];
  }

  async crawl(
    input?: UniqueUrl[] | NormalizedUrl[] | string[],
  ): Promise<GraphHandle> {
    if (is.undefined(input)) return this.graph;
    const seedUrls = new UniqueUrlSet(input);
    this.progress.total = seedUrls.size;

    this.fetcher.on('skip', (uu: UniqueUrl) => {
      this.progress.skipped++;
    });

    this.emit('start', this.progress);

    for (const url of seedUrls.values()) {
      this.enqueue(url);
    }

    return this.queue.onIdle().then(() => {
      this.emit('finish', this.progress);
      return this.graph;
    });
  }

  enqueue(url: UniqueUrl): void {
    if (!this.seen.has(url)) {
      this.queue.add(async () => this.processUrl(url));
      this.seen.add(url);
    }
  }

  async processUrl(targetUrl: UniqueUrl): Promise<void> {
    return this.fetcher
      .fetch(targetUrl)
      .then((entities) => {
        this.processFetchResults(targetUrl, entities);
      })
      .then(() => {
        this.progress.fetched++;
        this.emit('process', targetUrl, this.progress);
      })
      .catch((error: unknown) => {
        this.progress.errors++;
        this.emit('fail', error, targetUrl);
      });
  }

  processFetchResults(targetUrl: UniqueUrl, fetchResults: Entity[]): void {
    this.graph.add(fetchResults);

    const resource = fetchResults.find((entity) => isResource(entity)) as
      | Resource
      | undefined;

    if (resource && this.rules.parse(targetUrl.parsed!)) {
      const foundLinks = this.parseForLinks(resource, targetUrl.depth++);

      for (const entity of foundLinks) {
        if (
          isUniqueUrl(entity) &&
          entity.parsed &&
          this.rules.follow(entity.parsed) &&
          !this.seen.has(entity)
        ) {
          this.progress.total++;
          this.enqueue(entity);
        }
      }

      this.graph.add(foundLinks);
    }
  }

  parseForLinks(resource: Resource, depth = 0): Entity[] {
    const entities: Entity[] = [];

    let foundLinks: SitemapLink[] | HtmlLink[] = [];
    if (isHtml(resource)) {
      foundLinks = linksFromHtml(resource);
    }

    if (isSitemap(resource)) {
      foundLinks = linksFromSitemap(resource);
    }

    // Build entities for each link
    if (foundLinks.length > 0) {
      const newUniques = new UniqueUrlSet();

      for (const link of foundLinks) {
        const newUnique = new UniqueUrl(
          link.href,
          resource.url,
          depth,
          resource.url,
        );
        // This bit right here is actually quite expensive; the graph check
        // in particular can be ruinous if we're working against a SQL DB and
        // there are loads of individual links. Revisit it as soon as possible.
        if (
          !newUniques.has(newUnique) &&
          !this.seen.has(newUnique) &&
          !this.graph.has(newUnique)
        ) {
          this.progress.found++;
          entities.push(newUnique);
        }

        entities.push(new LinksTo(resource, newUnique, link));

        if (
          newUnique.parsed &&
          !this.rules.ignore(newUnique.parsed) &&
          !newUniques.has(newUnique)
        )
          entities.push(newUnique);
      }
    }

    return entities;
  }
}
