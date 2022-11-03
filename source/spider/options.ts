import {Dictionary, LogLevel, PlaywrightCrawlerOptions} from 'crawlee';
import {helpers, ProjectConfig, projectConfigDefaults} from '../index.js';
import {SpiderHook, defaultRouter} from './hooks/index.js';
import {EnqueueUrlOptions} from './links/index.js';
import {SpiderRequestHandler} from './handlers/index.js';

export type SpiderOptions = InternalSpiderOptions & Omit<PlaywrightCrawlerOptions,
'preNavigationHooks' |
'postNavigationHooks' |
'requestHandler' |
'handlePageFunction'
>;

export interface InternalSpiderOptions extends Dictionary {
  /**
   * An optional set of {@apilink ProjectConfig} settings to be used
   * if a global project context doesn't yet exist.
   *
   * See {@apilink Project.context()}
   *
   * @type {Partial<ProjectConfig>}
   */
  projectConfig: Partial<ProjectConfig>;

  /**
   * Logging level for the spider's internal crawler.
   * 
   * @default {LogLevel.OFF}
   * @type {LogLevel}
   */
  logLevel: LogLevel;

  /**
   * A function to evaluate and modify request objects before
   * they're crawled. The default router prefetches URL headers and
   * evaluates the resulting MIME type and response code, then applies
   * one of the following labels to the request:
   *
   * `page`: Successful HTML responses
   * `status`: 4xx and 5xx response codes
   * `download`: Mime types present in the `downloadMimeTypes` option
   *
   * These labels are used to map the request to a given requestHandler;
   * a custom router can override this behavior and use different labels.
   *
   * @type {SpiderHook}
   */
  requestRouter?: SpiderHook;

  /**
   * A function to process a successfully loaded page view. If none is
   * supplied, the default pageHandler will:
   *
   * 1. Save a {@apilink Resource} object for the page, including its HTML
   * 2. Save a {@apilink RespondsWith} object linking it to the current {@apilink UniqueUrl}
   * 3. Run {@apilink enqueueLinks} using the default settings, enqueing any
   *    links that point to the same domain as the resource's URL.
   *
   * @example
   * async function defaultPageHandler(context: SpiderContext) {
   *   const {$, saveResource, enqueueLinks} = context;
   *   await saveResource({body: $?.html()});
   *   await enqueueLinks();
   * }
   *
   * @default: {@apilink pageHandler}
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
   * these will apply whenever a request handler calls the `enqueueLinks`
   * function without custom options.
   *
   * The default options specify that all URLs on the page will be saved
   * but only URLs pointing to the same domain as the current page will be
   * enqueued for crawling.
   *
   * @type {EnqueueUrlOptions}
   */
  urlOptions: Partial<EnqueueUrlOptions>;

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
}

export function buildSpiderOptions(
  options: Partial<InternalSpiderOptions>,
  internaloverrides: Partial<InternalSpiderOptions> = {},
): InternalSpiderOptions {
  return {
    ...defaultSpiderOptions,
    ...options,
    ...internaloverrides,
  };
}

const defaultSpiderOptions: InternalSpiderOptions = {
  projectConfig: projectConfigDefaults,
  logLevel: LogLevel.OFF,
  requestRouter: defaultRouter,
  preNavigationHooks: [],
  postNavigationHooks: [],
  pageHandler: undefined,
  requestHandlers: {},
  urlOptions: {},
  parseMimeTypes: helpers.mimeGroups.page,
  downloadMimeTypes: [],
};
