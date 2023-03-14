import { RequestQueue, RequestTransform } from 'crawlee';
import { ParsedUrl } from '@autogram/url-tools';

import { FilterInput } from './index.js';
import { InternalSpiderContext } from '../../index.js';
import { PageRegion } from '../../tools/html/index.js';

export type PageLinkRegion = PageRegion & {
  /**
   * One or more CSS selectors used to find links in a given region.
   * 
   * These selectors should find elements with either a `src` or `href` tag; they're used after
   * a "bucket" of HMTL has been identified and specific URL-bearing elements must be found
   * inside of it.
   */
  linkSelectors?: string | string[],

  /**
   * Region-specific override for the filter that determines whether a URL should be saved
   * to the crawl database.
   */
  save?: FilterInput,

  /**
   * Region-specific override for the filter that determines whether a URL should be enqueued
   * for crawling.
   */
  enqueue?: FilterInput,

  /**
   * Region-specific override for the label for each saved URL and Link. If none is specified,
   * this defaults to the name of the region being processed.
   */
  label?: string,

  /**
   * Region-specific override for the default Request handler that should be used when processing
   * the URL during a crawl.
   */
  handler?: string
}

export enum UrlMatchStrategy {
  /**
   * Matches any URLs found
   */
  All = 'all',
  /**
   * Matches any URLs that have the same hostname.
   * For example, `https://wow.example.com/hello` will be matched for a base url of `https://example.com/`, but
   * `https://example.com/hello` will not be matched.
   */
  SameHostname = 'same-hostname',
  /**
   * Matches any URLs that have the same (sub-)domain as the base URL.
   * For example, `https://wow.an.example.com` and `https://example.com` will both be matched for a base url of
   * `https://example.com`.
   */
  SameDomain = 'same-domain',
  /**
   * Matches no URLs; useful when all or some URLs should be saved, but none should be enqueued.
   */
  None = 'none',
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
   * One or more CSS selectors used to locate links on the page.
   * 
   * @defaultValue 'body a'
   */
  selectors: string | string[];


  /**
   * A list of page regions in which different link-discovery rules should be applied.
   * By default, the region's name is saved as the {@link LinksTo.label} property on the
   * connection between a {@link Resource} and a {@link UniqueUrl}.
   * 
   * @example Find and label links inside the following tags
   * `regions: ['heading', 'main', 'footer'],`
   *
   * @example Find and label links with specific selectors
   * ```
   * regions: {
   *   heading: 'heading.site-hero',
   *   main: 'main > div.content',
   *   footer: 'div#global__footer-v2.DONTDELETE',
   * },
   * ```
   * 
   * @example Find links in regions, using custom settings for one region
   * ```
   * regions: {
   *   heading: 'heading.site-hero',
   *   main: 'main > div.content',
   *   footer: {
   *     selector: 'div#global__footer-v2.DONTDELETE',
   *     linkSelector: 'a:not(.endlessRedirect)',
   *     enqueue: UrlMatchStrategy.SameHostname
   *   },
   * },
   * ```
   */
  regions: string[] | Record<string, string | PageLinkRegion>

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
  discardUnparsable: boolean;

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
  discardEmpty: boolean;

  /**
   * Ignore links that only contain an anchor, e.g. `<a href="#top">Scroll to top</a>`
   *
   * @type {boolean}
   * @default true
   */
  discardlocalAnchors: boolean;

  /**
   * Ignore HTML tags with protocols other than `http` and `https`.
   *
   * *NOTE:* Only affects the saving of {@apilink UniqueUrl} objects; unparsable
   * links are never enqueued for crawling.
   *
   * @type {boolean}
   * @default true
   */
  discardNonWeb: boolean;

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
  discardExisting?: boolean;

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
