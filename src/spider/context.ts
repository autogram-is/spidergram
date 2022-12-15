
import {IncomingHttpHeaders} from 'node:http';
import {PlaywrightCrawlingContext, Request, CheerioRoot, PlaywrightGotoOptions, PlaywrightRequestHandler, PlaywrightHook} from 'crawlee';
import {TDiskDriver} from 'typefs';
import {UniqueUrl, Resource} from '../model/index.js';
import {ArangoStore} from '../services/arango-store.js';
import {EnqueueUrlOptions} from './links/index.js';
import { HtmlTools } from '../index.js';
import {InternalSpiderOptions} from './options.js';
import {SpiderHook} from './hooks/index.js';
import {SpiderRequestHandler} from './handlers/index.js';

export type SpiderContext = InternalSpiderContext & PlaywrightCrawlingContext;

export interface InternalSpiderContext extends InternalSpiderOptions {
  /**
   * A copy of the {@apilink UniqueUrl} object corresponding to the
   * current request.
   *
   * @type {UniqueUrl}
   */
  uniqueUrl?: UniqueUrl;

  /**
   * If a {@apilink Resource} object for the current request response
   * has been saved, this property contains a reference to it. Useful
   * when running postNavigationHook functions that rely on information
   * created during request processing.
   *
   * @type {UniqueUrl}
   */
  resource?: Resource;

  /**
   * Basic properties of the HTTP response for the current request,
   * including status code and headers.
   *
   * @type {RequestMeta}
   */
  requestMeta?: RequestMeta;

  /**
   * On parsable HTML pages, a pre-populated Cheerio instance.
   *
   * @type {CheerioRoot}
   */
  $?: CheerioRoot;

  /**
   * Execute a `HEAD` request for the current URL; used to populate
   * the crawl context's `requestMeta` property.
   *
   * *NOTE:* Only useful when overriding the spider's default requestRouter.
   *
   * @type {Function}
   */
  prefetchRequest: () => Promise<RequestMeta>;

  /**
   * Save a {@apilink Resource} for the current request response, and
   * a {@apilink RespondsWith} object linking it to the current {@apilink UniqueUrl}.
   *
   * If no parameters are supplied, the Resource is saved with no body text;
   * this can be useful when saving stub records of HTTP errors or
   * checking for 404s without downloading the full HTTP payload.
   *
   * @example
   * function myCustomHandler({$, saveResource}) {
   *   await saveResource({ body: $.html() })
   * }
   *
   * @type {Function}
   */
  saveResource: (data?: Record<string, unknown>) => Promise<Resource>;

  /**
   * Parses the current HTML page for links, saving them as {@apilink UniqueUrl}
   * objects and enqueing them as crawl requests. @see {@apilink EnqueueUrlOptions}
   * for default options.
   *
   * @example
   * function myCustomHandler({ enqueueUrls }) {
   *   await enqueueUrls({
   *     selector: 'nav a',
   *     label: 'navigation'
   *   });
   *
   *   await enqueueUrls({
   *     selector: 'body main a',
   *     label: 'body'
   *   });
   * }
   *
   * @type {Function}
   */
  enqueueUrls: (options?: Partial<EnqueueUrlOptions>) => Promise<unknown>;

  /**
   * Finds URLs on the current page matching the criteria specified
   * in the options; but does not save or enqueue them.
   * @type {Function}
   */
  findUrls: (options?: Partial<EnqueueUrlOptions>) => Promise<HtmlTools.LinkData[]>;

  /**
   * Saves a list of found links as {@apilink UniqueUrl} objects, applying
   * any filters and normalization functions in the current options, but
   * does not enqueue them.
   * @type {Function}
   */
  saveUrls: (links: HtmlTools.LinkData[], options?: Partial<EnqueueUrlOptions>) => Promise<UniqueUrl[]>;

  /**
   * Accepts a list of {@apilink UniqueUrl} objects, applies any filters
   * specified in the options, and enqueues them as {@apilink Request} objects
   * for the current crawl.
   * @type {Function}
   */
  saveRequests: (urls: UniqueUrl[], options?: Partial<EnqueueUrlOptions>) => Promise<Request[]>;

  /**
   * A connection to the project's Arango graph database. Can be used to
   * save objects and data when bypassing helper functions like `saveResource`
   * and `saveUrls`.
   *
   * @type {ArangoStore}
   */
  graph: ArangoStore;

  /**
   * Async function that returns a given file storage bucket, suitable for reading/
   * writing crawl data or reports, based on the project's storage configuration.
   * Storage buckets can point to files on a local disk, Amazon S3 buckets, etc.
   *
   * Calling files() with no parameters returns the project 'default' storage bucket,
   * while passing in the name of a specific bucket will use it, if configured.
   *
   * @see {@apilink Project} for configuration details and defaults.
   *
   * @example
   * function myCustomHandler({ saveResource, files, $ }) {
   *   const filename = `payloads/${request.uniqueKey}.html`;
   *   await saveResource({ files: [ filename ]});
   *   await files().write(filename, $.html());
   * }
   *
   * @type {Function}
   */
  files: (bucket?: string) => TDiskDriver;
}

export interface RequestMeta {
  url: string;
  method?: string;
  redirectUrls?: URL[];
  headers: IncomingHttpHeaders;
  statusMessage?: string;
  statusCode: number;
  type?: string;
}

/**
 * Wraps a preNavigation or postNavigation hook that expects Spidergram's global context
 * for use with PlaywrightCrawler
 */
export function contextualizeHook(hook: SpiderHook): PlaywrightHook {
  return async (
    ctx: PlaywrightCrawlingContext,
    options?: PlaywrightGotoOptions,
  ): Promise<void> => hook(ctx as SpiderContext, options);
}

/**
 * Wraps a handler that expects Spidergram's global context for use with PlaywrightCrawler
 */
export function contextualizeHandler(handler: SpiderRequestHandler): PlaywrightRequestHandler {
  return async (ctx: PlaywrightCrawlingContext): Promise<void> => handler(ctx as unknown as SpiderContext);
}
