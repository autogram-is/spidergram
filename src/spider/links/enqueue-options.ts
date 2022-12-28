import { RequestQueue, EnqueueStrategy, RequestTransform } from 'crawlee';
import { ParsedUrl } from '@autogram/url-tools';
import { InternalSpiderContext } from '../../index.js';
import { FilterInput } from './index.js';

/**
 * @export
 * @interface EnqueueUrlOptions
 * @typedef {EnqueueUrlOptions}
 */
export interface EnqueueUrlOptions {
  /**
   * Limits the number of links that will be enqueued by this call; useful for
   * selecting a subset of links on the page for testing.
   *
   * @default: Infinity
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
   * @type {boolean | string | RegExp | EnqueueStrategy | UrlFilterWithContext}
   * @default EnqueueStrategy.All
   */
  save: FilterInput;

  /**
   * When enqueing a new hostname, infer a sitemap URL and enqueue it as well.
   *
   * @type {boolean}
   * @default true
   */
  alwaysCheckForSitemap: boolean;

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
   * @type {boolean | string | RegExp | EnqueueStrategy | UrlFilterWithContext}
   * @default EnqueueStrategy.SameDomain
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
  requestLabel?: string;
}

export type UrlMutatorWithContext<T extends InternalSpiderContext = InternalSpiderContext> = (
  found: ParsedUrl,
  context?: T,
) => ParsedUrl;

export const urlDiscoveryDefaultOptions: EnqueueUrlOptions = {
  limit: Number.POSITIVE_INFINITY,
  selector: 'body a, head link',
  save: EnqueueStrategy.All,
  enqueue: EnqueueStrategy.SameDomain,
  alwaysCheckForSitemap: true,
  prioritizeSitemaps: true,
  discardEmptyLinks: true,
  discardAnchorOnlyLinks: true,
  discardNonWebLinks: false,
  discardUnparsableLinks: false,
  discardExistingLinks: true,
};
