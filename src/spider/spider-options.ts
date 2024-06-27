import { Cookie, Dictionary, LogLevel, PlaywrightCrawlerOptions } from 'crawlee';
import { SpiderHook } from './hooks/index.js';
import { EnqueueUrlOptions } from './links/index.js';
import { SpiderRequestHandler } from './handlers/index.js';
import { AxeAuditOptions } from '../tools/browser/axe-auditor.js';

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
   * Iterate over the browser document to ensure Shadow DOM elements
   * are recognized and included in the page content.
   *
   * Note: This may interfere with interactive on-page elements; in general,
   * it should only be turned on if you know page content is NOT being
   * recognized.
   *
   * @defaultValue false
   */
  shadowDom?: boolean;

  /**
   * The indicator to wait for when determining whether a page has been fully loaded.
   *
   * @see {@link Playwright Navigation Lifecycle | https://playwright.dev/dotnet/docs/navigations#navigation-lifecycle }
   * @defaultValue "networkidle"
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';

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
  urls: EnqueueUrlOptions;

  /**
   * Tailor the spider's browser settings to hide the fact that it's an automated
   * crawler. If this option is set, the {@link userAgent} property will be ignored.
   *
   * Note that the stealth option is experimental and may cause issues with some sites.
   */
  stealth?: boolean;

  /**
   * An array of MIME type strings used to recognize HTTP requests as
   * parsable HTML pages. Specific mime types or glob strings ('text/*', etc.)
   * can be used.
   *
   * @see {@apilink mimeGroups}, a helper collection of common mime types
   * grouped by document type. (Word processing files, web assets, media, etc.)
   *
   * @default ['text/html']
   */
  parseMimeTypes: string[];

  /**
   * An array of MIME type strings used to mark a request for downloading
   * rather than loading and parsing.
   *
   * @see {@apilink mimeGroups}, a helper collection of common mime types
   * grouped by document type. (Word processing files, web assets, media, etc.)
   */
  downloadMimeTypes: string[];

  /**
   * An array of functions to run *before* a request is processed but *after*
   * the router has evaluated its headers and labeled the request.
   *
   * This can be used to add additional headers or custom authentication cookies
   * for sites that require logins.
   */
  preNavigationHooks: SpiderHook[];

  /**
   * An array of functions to run after a page has been loaded and the page's
   * resource has been created, but before data is saved or the page is closed.
   */
  preSaveHooks: SpiderHook[];

  /**
   * An array of functions to run after a request has been processed.
   * May be useful for logging, destroying any expensive resources created
   * during processing, etc.
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
   * After a page has loaded, save information about its load speed and performance
   * along with other page metadata. While this is not as accurate as services like
   * Google PageSpeed Insights, it can be a useful point of comparison between multiple
   * pages crawled under the same conditions.
   */
  savePerformance?: boolean | 'summary';

  /**
   * Save any browser cookies set during page rendering.
   */
  saveCookies?: boolean | 'summary';

  /**
   * Save a list of the XmlHttpRequests sent while the page loads.
   */
  saveXhrList?: boolean | 'summary';

  /**
   * Run an accessibility audit on the page; this may increase crawl time on large pages.
   *
   * Can be toggled on and off with a boolean value, or set to summarize violations by
   * level of impact with a 'summary' value.
   *
   * @defaultValue false
   */
  auditAccessibility?: boolean | AxeAuditOptions;

  /**
   * Number of seconds to wait for a handler before cancelling the request and
   * treating it as an eror. np
   *
   * @default 180
   * @type {?number}
   */
  handlerTimeout?: number;
  
  cookies?: Cookie[],

  prefetchMethod?: 'GET' | 'HEAD',
}
