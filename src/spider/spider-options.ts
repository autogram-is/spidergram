import { Dictionary, LogLevel, PlaywrightCrawlerOptions } from 'crawlee';
import { SpiderHook } from './hooks/index.js';
import { EnqueueUrlOptions } from './links/index.js';
import { SpiderRequestHandler } from './handlers/index.js';
import { PageAnalysisOptions } from '../tools/analyze-page.js';

export type SpiderOptions = InternalSpiderOptions &
  Omit<
    PlaywrightCrawlerOptions,
    | 'preNavigationHooks'
    | 'postNavigationHooks'
    | 'requestHandler'
    | 'handlePageFunction'
  >;

export interface InternalSpiderOptions extends Dictionary {
  /**
   * Logging level for the spider's internal crawler.
   *
   * @default {LogLevel.INFO}
   * @type {LogLevel}
   */
  logLevel: LogLevel;

  /**
   * A function to process a successfully loaded page view. If none is
   * supplied, the default pageHandler will:
   *
   * 1. Save a {@apilink Resource} object for the page, including its HTML
   * 2. Save a {@apilink RespondsWith} object linking it to the current {@apilink UniqueUrl}
   * 3. Run {@apilink enqueueUrls} using the default settings, enqueing any
   *    links that point to the same domain as the resource's URL.
   *
   * @example
   * async function defaultPageHandler(context: SpiderContext) {
   *   const {page, saveResource, enqueueUrls} = context;
   *   await saveResource({ body: await page.content() });
   *   await enqueueUrls();
   * }
   *
   * @defaultValue {@apilink pageHandler}
   * @type {SpiderRequestHandler}
   */
  pageHandler?: SpiderRequestHandler;

  /**
   * Options to control the pageHandler's parsing of HTML content. This can be
   * used to frontload certain analysis work (like technology fingerprinting) or
   * delay time consuming operations (like named entity extraction) until a post-
   * crawl analysis step.
   */
  pageOptions?: PageAnalysisOptions;

  /**
   * A dictionary of request handlers, keyed by the request label they're
   * responsible for. Handlers for `page`, `download`, and `status` are
   * populated by default; using those keys will override the spider's
   * default behavior for those labels.
   *
   * Handlers for other labels can be supplied, but will not be triggered
   * unless a custom `requestRouter` is suppled to add those labels to
   * requests before they're crawled.
   *
   * @example
   * requestHandlers: {
   *   page: myCustomPageHandler,
   *   download: context => {},
   *   status: async context => { await context.saveResource(); };
   * }
   *
   * @type {Record<string, SpiderRequestHandler}
   */
  requestHandlers: Record<string, SpiderRequestHandler>;

  /**
   * Overrides for the default URL filtering and enqueing options;
   * these will apply whenever a request handler calls the `enqueueUrls`
   * function without custom options.
   *
   * The default options specify that all URLs on the page will be saved
   * but only URLs pointing to the same domain as the current page will be
   * enqueued for crawling.
   *
   * @type {EnqueueUrlOptions}
   */
  urlOptions: EnqueueUrlOptions;

  /**
   * An array of MIME type strings used to recognize HTTP requests as
   * parsable HTML pages. Specific mime types or glob strings ('text/*', etc.)
   * can be used.
   *
   * @see {@apilink mimeGroups}, a helper collection of common mime types
   * grouped by document type. (Word processing files, web assets, media, etc.)
   *
   * @default ['text/html']
   * @type {EnqueueUrlOptions}
   */
  parseMimeTypes: string[];

  /**
   * An array of MIME type strings used to mark a request for downloading
   * rather than loading and parsing.
   *
   * @see {@apilink mimeGroups}, a helper collection of common mime types
   * grouped by document type. (Word processing files, web assets, media, etc.)
   *
   * @default empty
   * @type {EnqueueUrlOptions}
   */
  downloadMimeTypes: string[];

  /**
   * After a page has loaded, save information about its load speed and performance
   * along with other page metadata. While this is not as accurate as services like
   * Google PageSpeed Insights, it can be a useful point of comparison between multiple
   * pages crawled under the same conditions.
   *
   * @type {?boolean}
   */
  savePerformance?: boolean;

  /**
   * An array of functions to run *before* a request is processed but *after*
   * the router has evaluated its headers and labeled the request.
   *
   * This can be used to add additional headers or custom authentication cookies
   * for sites that require logins.
   *
   * @type {Array<SpiderHook>}
   */
  preNavigationHooks: SpiderHook[];

  /**
   * An array of functions to run after a request has been processed.
   * May be useful for logging, destroying any expensive resources created
   * during processing, etc.
   *
   * @type {Array<SpiderHook>}
   */
  postNavigationHooks: SpiderHook[];

  /**
   * User-agent to use when requesting pages; if none is specified, reasonable defaults
   * for the chosen browser engine will be used.
   *
   * @type {string}
   */
  userAgent?: string;

  /**
   * Save any browser cookies set during page rendering.
   */
  saveCookies?: boolean;

  /**
   * Run an accessibility audit on the page; this may increase crawl time on large pages.
   *
   * Can be toggled on and off with a boolean value, or set to summarize violations by
   * level of impact with a 'summary' value.
   *
   * @defaultValue false
   */
  auditAccessibility?: 'summary' | boolean;

  /**
   * Number of seconds to wait for a handler before cancelling the request and
   * treating it as an eror. np
   *
   * @default 180
   * @type {?number}
   */
  handlerTimeout?: number;
}
