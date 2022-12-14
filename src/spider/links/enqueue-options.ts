import { RequestQueue, RequestTransform } from 'crawlee';
import { ParsedUrl } from '@autogram/url-tools';
import { InternalSpiderContext } from '../../index.js';
import { FilterInput } from './index.js';

export enum UrlMatchStrategy {
  /**
   * Matches any URLs found
   */
  All = "all",
  /**
   * Matches any URLs that have the same hostname.
   * For example, `https://wow.example.com/hello` will be matched for a base url of `https://example.com/`, but
   * `https://example.com/hello` will not be matched.
   */
  SameHostname = "same-hostname",
  /**
   * Matches any URLs that have the same (sub-)domain as the base URL.
   * For example, `https://wow.an.example.com` and `https://example.com` will both be matched for a base url of
   * `https://example.com`.
   */
  SameDomain = "same-domain",
  /**
   * Matches no URLs; useful when all or some URLs should be saved, but none should be enqueued.
   */
  None = "none"
}

/**
 * Configuration options for Spidergram's URL enqueing options.
 */
export interface EnqueueUrlOptions {
  /**
   * Limits the number of links that will be enqueued by this call; useful for
   * selecting a subset of links on the page for testing.
   *
   * @defaultValue Infinity
   */
  limit: number;

  /**
   * The CSS selector used to find links on the page; {@apilink enqueueUrls}
   * can be run multiple times with different options on a given page to find
   * and capture different sets of links, e.g. navigation vs footer vs body.
   *
   * @default 'body a, head link'
   */
  selector: string;

  /**
   * A filter condition to determine which links will be saved as
   * {@apilink UniqueUrl} objects in the current project's graph.
   *
   * @type {boolean | string | RegExp | UrlMatchStrategy | UrlFilterWithContext}
   * @default UrlMatchStrategy.All
   */
  save: FilterInput;

  /**
   * When enqueing a new hostname, enqueue a high-priority robots.txt as well.
   *
   * @type {boolean}
   * @default true
   */
  checkRobots: boolean;

  /**
   * Do not enqueue URLs if they're disallowed in a hostname's Robots.txt.
   *
   * @type {boolean}
   * @default true
   */
  respectRobots: boolean;

  /**
   * When enqueing a new hostname, infer a sitemap URL and enqueue it as well.
   *
   * @type {boolean}
   * @default true
   */
  checkSitemaps: boolean;

  /**
   * When enqueuing, bump sitemap.xml links to the top of the request queue.
   *
   * @type {boolean}
   * @default true
   */
  prioritizeSitemaps: boolean;

  /**
   * A filter condition to determine which links will be enqueued for crawling.
   *
   * @type {boolean | string | RegExp | UrlMatchStrategy | UrlFilterWithContext}
   * @default UrlMatchStrategy.SameDomain
   */
  enqueue: FilterInput;

  /**
   * Ignore links that can't be parsed by the {@apilink URL} constructor.
   *
   * *NOTE:* Only affects the saving of {@apilink UniqueUrl} objects; unparsable
   * links are never enqueued for crawling.
   *
   * @type {boolean}
   * @default false
   */
  discardUnparsableLinks: boolean;

  /**
   * Ignore HTML tags that are found by the selector, but have no `href`
   * property.
   *
   * *NOTE:* Only affects the saving of {@apilink UniqueUrl} objects; unparsable
   * links are never enqueued for crawling.
   *
   * @type {boolean}
   * @default true
   */
  discardEmptyLinks: boolean;

  /**
   * Ignore links that only contain an anchor, e.g. `<a href="#top">Scroll to top</a>`
   *
   * @type {boolean}
   * @default true
   */
  discardAnchorOnlyLinks: boolean;

  /**
   * Ignore HTML tags with protocols other than `http` and `https`.
   *
   * *NOTE:* Only affects the saving of {@apilink UniqueUrl} objects; unparsable
   * links are never enqueued for crawling.
   *
   * @type {boolean}
   * @default true
   */
  discardNonWebLinks: boolean;

  /**
   * A function to modify the {@apilink Request} object before a link is
   * enqueued for crawling.
   *
   * Custom headers, request labels, etc. can be added here if needed, and
   * used by the request router and handlers to control processing later in
   * the crawl process.
   *
   * @type {string}
   */
  transformRequestFunction?: RequestTransform;

  /**
   * The base URL that should be used when parsing relative URLs. If none
   * is specified, this defaults to the URL of the page being parsed for URLs.
   *
   * @default {boolean}
   * @type {string}
   */
  baseUrl?: string;

  /**
   * The RequestQueue used to enqueue the links.
   *
   * By default this is the current crawl's internal queue, but a custom
   * queue can be passed in for special handling (ie, creating a separate
   * list of URLs for page screenshots after the main crawl completes)
   *
   * @type {string}
   */
  requestQueue?: RequestQueue;

  /**
   * Don't save or enqueue the link if it already exists in the graph.
   *
   * *NOTE:* Only affects the saving and enqueuing of {@apilink UniqueUrl}
   * objects themselves; LinksTo records connection crawled Resources to
   * the UniqueUrl may still be created.
   *
   * @type {boolean}
   * @default true
   */
  discardExistingLinks?: boolean;

  /**
   * A label applied to any {@apilink LinksTo} objects created when the
   * URLs are saved to the project graph. This can be used in conjunction
   * with a restrictive selector to record which links appeared in body
   * text, which links appeared in navigation menus, and so on.
   *
   * @default {undefined}
   * @type {string}
   */
  linkLabel?: string;

  /**
   * A label applied to any {@apilink Request} objects created when the
   * URLs are enqueued for crawling. This can be used to control which
   * handlers process the resulting HTTP responses.
   *
   * @default {undefined}
   * @type {string}
   */
  handler?: string;

  /**
   * If URLs found in this operation are enqueued, move them to the front
   * ofr the request queue.
   *
   * @default {false}
   * @type {boolean}
   */
  prioritize?: boolean;

  /**
   * An optional normalizer function to override the crawl- and project-wide
   * normalizer defaults.
   *
   * @default {undefined}
   * @type {UrlMutatorWithContext}
   */
  normalizer?: UrlMutatorWithContext;
}

export type UrlMutatorWithContext<
  T extends InternalSpiderContext = InternalSpiderContext,
> = (found: ParsedUrl, context?: T) => ParsedUrl;

export const urlDiscoveryDefaultOptions: EnqueueUrlOptions = {
  limit: Number.POSITIVE_INFINITY,
  selector: 'body a',
  save: UrlMatchStrategy.All,
  enqueue: UrlMatchStrategy.SameDomain,
  prioritize: false,
  checkRobots: false,
  respectRobots: false,
  checkSitemaps: false,
  prioritizeSitemaps: false,
  discardEmptyLinks: true,
  discardAnchorOnlyLinks: true,
  discardNonWebLinks: false,
  discardUnparsableLinks: false,
  discardExistingLinks: true,
};
