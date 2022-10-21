// Drop-in replacement for the enqueueLinks function included
// in Crawlee's global context. Ours has a few additional options
// and handles Spidergram-specific grunt work:
//
// 1. An additional 'same directory' discovery strategy
// 2. Allow UrlFilter and UrlFilterWithContext functions for more
//    complex link filtering logic
// 3. Allow dictionaries of selectors/globs/filters in addition to
//    arrays; the key is saved on SpiderGram's link record, for
//    later use categorizing internal links.  
// 4. Build UniqueUrl and LinkTo entities for Spidergram in addition
//    to Crawlee Request objects; use SpiderContext UrlFilters to
//    determine which ones are ignored, saved or enqueued.

import { EnqueueLinksOptions, CrawlingContext } from "crawlee";
import { SpiderLocalContext, UrlFilterWithContext } from "../options.js";
import { RequestInspector } from "../inspectors/inspector.js";
import { RequestHandler } from "../handlers/handler.js";

type SupportedCrawleeOptions = Partial<Pick<EnqueueLinksOptions,
  'limit' |
  'selector' |
  'userData' |
  'label' |
  'baseUrl' |
  'globs' |
  'regexps' |
  'pseudoUrls' |
  'transformRequestFunction' |
  'strategy'
>>;

/**
 * Structured dumping ground for links found in markup; flexible enough
 * to represent both `<a>` and `<link>` tags; `context` and  `selector`
 * should be used to store information about where the link was found
 * that can't be intuited from the data/attributes/etc.
 */
 export type HtmlLink = {
  href: string;
  selector?: string;
  context?: string;
  rel?: string;
  title?: string;
  attributes?: Record<string, string>;
  data?: string | Record<string, string>;
};

export interface EnqueueUrlsOptions<Context extends CrawlingContext = CrawlingContext> extends SupportedCrawleeOptions {
  inspector: RequestInspector,
  requestHandler: RequestHandler<Context>,
  filters: UrlFilterWithContext[],
  skipEmptyLinks: boolean,
  skipAnchors: boolean,
  label: string,
}

/**
 * Finds URLs matching the criteria specified in `options`, saves them
 * to Spidergram's storage database as UniqueUrls found on the current
 * Resource, then creates and enqueues Request objects for them.
 * @param options 
 */
export function enqueueUrls<Context extends CrawlingContext = CrawlingContext>(options: EnqueueUrlsOptions<Context>, context: SpiderLocalContext<Context>) {

}

export function findUrls<Context extends CrawlingContext = CrawlingContext>(context: SpiderLocalContext, options: EnqueueUrlsOptions<Context>) {

}

export function saveUrls<Context extends CrawlingContext = CrawlingContext>(options: EnqueueUrlsOptions<Context>) {

}

export function enqueueRequests<Context extends CrawlingContext = CrawlingContext>(options: EnqueueUrlsOptions<Context>) {

}