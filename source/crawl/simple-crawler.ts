import { EventEmitter } from 'node:events';
import is from '@sindresorhus/is';
import { ParsedUrl, NormalizedUrl } from '@autogram/url-tools';
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
import { linksFromHtml, HtmlLink } from '../extract/links-from-html.js';
import {
  linksFromSitemap,
  SitemapLink,
} from '../extract/links-from-sitemap.js';
import { Extractor } from '../util/types.js';
import { UniqueUrlPool } from './unique-url-pool.js';
import { Crawler, CrawlOptions, GraphHandle } from './crawler.js';

export interface SimpleCrawlOptions extends CrawlOptions {
  graph?: GraphHandle;
  fetcher?: Fetcher;
  extractor?: Extractor<Resource, HtmlLink[] | SitemapLink[]>;
}

export class SimpleCrawler extends EventEmitter implements Crawler {
  graph: GraphHandle;
  fetcher: Fetcher;
  pool: UniqueUrlPool;
  extractor: Extractor<Resource, HtmlLink[] | SitemapLink[]>;

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
    invalid: 0,
  };

  constructor(options: SimpleCrawlOptions = {}) {
    super();
    this.fetcher = options.fetcher ?? new GotFetcher();
    this.graph = options.graph ?? new JsonGraph();
    this.pool = new UniqueUrlPool(this.processUrl);
    this.extractor = options.extractor ?? linksFromHtml;
    this.rules = {
      ...this.rules,
      ...options.rules,
    };
  }

  eventNames(): string[] {
    return ['start', 'skip', 'process', 'discover', 'error', 'fail'];
  }

  async crawl(input?: UniqueUrl[] | NormalizedUrl[] | string[]): Promise<void> {
    if (is.undefined(input)) return;
    const pool = new UniqueUrlSet(input);
    this.progress.total = this.pool.size;
    this.progress.invalid = this.pool.unparsable.size;

    // Pass on status events from the Fetcher class;
    this.fetcher
      .on('skip', (uu: UniqueUrl) => {
        this.progress.skipped++;
        this.emit('skip', uu, this.progress);
      })
      .on('fetch', (uu: UniqueUrl) => {
        this.progress.fetched++;
        this.emit('process', uu, this.progress);
      })
      .on('status', (uu: UniqueUrl) => {
        this.progress.fetched++;
        this.emit('process', uu, this.progress);
      })
      .on('fail', (error: unknown, uu: UniqueUrl) => {
        this.progress.errors++;
        this.emit('process', uu, this.progress);
      });

    this.emit('start', this.progress);

    const url = this.pool.next();
    if (url && is.urlInstance(url.parsed)) {
      console.log('queueing');
      if (this.rules.ignore(url.parsed)) this.pool.skip(url);
      await this.queueUrl(url);
    }

    this.emit('finish', this.progress);
  }

  processFetchResults(targetUrl: UniqueUrl, fetchResults: Entity[]): void {
    console.log(`Recieved response: ${targetUrl.url}`);
    // Save the resulting resources and mark the URL as completed.
    this.graph.add(fetchResults);
    this.pool.complete(targetUrl);

    const resource = (fetchResults.find((entity) => isResource(entity)) as Resource | undefined);

    if (resource && this.rules.parse(targetUrl.parsed!)) {
      const foundLinks = this.parseForLinks(resource);

      for (let entity of foundLinks) {
        // Find UniqueUrls and enqueue them
        if (isUniqueUrl(entity)) {
          this.pool.add(entity);
        }
      }

      this.graph.add(foundLinks)
    }
  }

  parseForLinks(resource: Resource): Entity[] {
    const entities:Entity[] = [];

    let foundLinks: SitemapLink[] | HtmlLink[] = [];
    if (isHtml(resource)) {
      foundLinks = this.extractor(resource);
    }

    if (isSitemap(resource)) {
      foundLinks = linksFromSitemap(resource);
    }

    // Build entities for each link
    if (foundLinks.length > 0) {
      const newUniques = new UniqueUrlSet();

      for (const link of foundLinks) {
        const normalized = new NormalizedUrl(link.href, resource.url);
        if (this.rules.ignore(normalized)) {
          continue;
        } else {
          const newUnique = new UniqueUrl(normalized, resource.url);
          if (!newUniques.has(newUnique)) entities.push(newUnique);
          entities.push(new LinksTo(resource, newUnique, link));
        }
      }
    }

    // Now cull out any that already exist in the pool or graph.
    const trulyNewEntities: Entity[] = [];

    for (const entity of entities) {
      if (isUniqueUrl(entity)) {
        if (!this.pool.has(entity) && !this.graph.has(entity)) {
          this.progress.found++;
          trulyNewEntities.push(entity);
          if (entity.parsed && this.rules.follow(entity.parsed)) {
            this.pool.add(entity);
          }
        }
      } else {
        // It's a LinksTo record
        trulyNewEntities.push(entity);
      }
    }

    return trulyNewEntities;
  }

  queueUrl(targetUrl: UniqueUrl) {
    this.pool.queue.add(() => this.processUrl(targetUrl));
  }

  async processUrl(targetUrl: UniqueUrl): Promise<void> {
    return this.fetcher
      .fetch(targetUrl)
      .then(entities => {
        console.log(entities);
        // this.processFetchResults(targetUrl, entities);
      })
      .catch((reason: unknown) => {
        this.emit('fail', reason, targetUrl);
      });
  }
}
