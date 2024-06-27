import is from '@sindresorhus/is';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import arrify from 'arrify';
import {
  log,
  Request,
  PlaywrightCrawlingContext,
  PlaywrightDirectNavigationOptions,
  SystemInfo,
} from 'crawlee';
import { FinalStatistics } from 'crawlee';
import _ from 'lodash';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// We have a chance to set the log level HIGHER when configuring,
// but this (hopefully) ensures that sub-logs won't be created
// at the higher level elsewhere.
log.setLevel(log.LEVELS.OFF);

import {
  PlaywrightCrawler,
  PlaywrightCrawlerOptions,
  Configuration,
  createPlaywrightRouter,
  RequestOptions,
} from 'crawlee';
import { NormalizedUrl, ParsedUrl } from '@autogram/url-tools';
import { Spidergram } from '../index.js';
import { Dataset, UniqueUrl, UniqueUrlSet } from '../model/index.js';
import { SpiderRequestHandler } from './handlers/index.js';
import {
  InternalSpiderOptions,
  SpiderOptions,
  SpiderContext,
  handlers,
  helpers,
  contextualizeHandler,
  contextualizeHook,
  uniqueUrlToRequest,
  SpiderStatus,
} from './index.js';

type SpiderEventMap = Record<PropertyKey, unknown[]> & {
  systemInfo: [status: SystemInfo & SpiderStatus];
  progress: [status: SpiderStatus, url: string];
  end: [status: SpiderStatus & FinalStatistics];
  aborting: [reason: string];
  exiting: [reason: string];
};

type SpiderEventType = keyof SpiderEventMap;
type SpiderEventParams<T extends SpiderEventType> = SpiderEventMap[T];
type SpiderEventListener<T extends SpiderEventType> = (
  ...args: SpiderEventParams<T>
) => unknown;

type RequestValue =
  | string
  | Request
  | RequestOptions
  | NormalizedUrl
  | UniqueUrl;

export class Spider extends PlaywrightCrawler {
  spiderOptions: InternalSpiderOptions;
  crawlerOptions: PlaywrightCrawlerOptions;
  status: SpiderStatus = {
    total: 0,
    finished: 0,
    failed: 0,
    startTime: 0,
    finishTime: 0,
    requestsByStatus: {},
    requestsByType: {},
    requestsByHost: {},
    requestsByLabel: {},
  };
  protected _events: AsyncEventEmitter<SpiderEventMap>;

  constructor(options: Partial<SpiderOptions> = {}, config?: Configuration) {
    const { crawler, internal } = splitOptions(options);

    const requestHandlers: Record<string, SpiderRequestHandler> = {
      page: internal.pageHandler ?? handlers.pageHandler,
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      sitemap: handlers.sitemapHandler,
      robotstxt: handlers.robotsTxtHandler,
      ...internal.requestHandlers,
    };

    const router = createPlaywrightRouter();
    router.addDefaultHandler(contextualizeHandler(requestHandlers.page));
    for (const h in requestHandlers) {
      router.addHandler(h, contextualizeHandler(requestHandlers[h]));
    }

    crawler.requestHandler = router;

    crawler.preNavigationHooks = [
      ...(internal.preNavigationHooks ?? []).map(hook =>
        contextualizeHook(hook),
      ),
    ];

    if (options.cookies) {
      // crawler.useSessionPool = true;
      // crawler.persistCookiesPerSession = true;

      crawler.preNavigationHooks.push(
        async ({ page }) => { await page.context().addCookies(options.cookies ?? []); }
      )
    }

    crawler.postNavigationHooks = [
      ...(internal.postNavigationHooks ?? []).map(hook =>
        contextualizeHook(hook),
      ),
    ];

    crawler.failedRequestHandler = async (
      ctx: PlaywrightCrawlingContext,
      error: Error,
    ): Promise<void> =>
      handlers.failureHandler(ctx as unknown as SpiderContext, error);

    const launchContext: (typeof crawler)['launchContext'] = {};
    if (internal.userAgent && !internal.stealth) {
      launchContext.userAgent = internal.userAgent;
    }

    launchContext.launchOptions ??= {};
    launchContext.launchOptions.headless = !!crawler.headless;

    if (internal.stealth) {
      chromium.use(StealthPlugin());
      launchContext.launcher = chromium;
    }

    crawler.launchContext = launchContext;

    crawler.browserPoolOptions = {
      preLaunchHooks: [
        async (_, launchContext) => {
          launchContext.ignoreHTTPSErrors = true;
        },
      ], useFingerprints: true
    };

    // We're bumping this up to deal with exceptionally horrible sites.
    if (options.auditAccessibility) {
      // …And adding an extra buffer when the all1 checker is turned on.
      crawler.requestHandlerTimeoutSecs = (internal.handlerTimeout ?? 60) + 30;
    } else {
      crawler.requestHandlerTimeoutSecs = internal.handlerTimeout;
    }

    if (options.waitUntil) {
      crawler.preNavigationHooks.push((ctx, opt) => {
        opt ??= {};
        opt.waitUntil = options.waitUntil;
      });
    }

    super(crawler, config);

    this.spiderOptions = internal;
    this.crawlerOptions = crawler;

    this._events = new AsyncEventEmitter();

    // Intercept and re-map the Crawlee systemInfo event
    this.events.on('systemInfo', (info: SystemInfo) => {
      this._events.emit('systemInfo', { ...info, ...this.status });
    });
  }

  protected override async _runRequestHandler(
    context: PlaywrightCrawlingContext,
  ) {
    await helpers.enhanceSpiderContext(context as SpiderContext);
    await helpers.requestPrecheck(context as SpiderContext);
    await super._runRequestHandler(context);
  }

  protected override async _navigationHandler(
    crawlingContext: PlaywrightCrawlingContext,
    gotoOptions: PlaywrightDirectNavigationOptions,
  ) {
    return super._navigationHandler(crawlingContext, gotoOptions);
  }

  /**
   * Respond to an internal Spider event.
   *
   * - `systemInfo`: Fired at regular intervals, summarizing memory and server load
   * - `progress`: Fired when a specific reqest has been processed
   * - `end`: Fired when last request in the queue has been processed
   */
  on<T extends SpiderEventType>(
    event: T,
    listener: SpiderEventListener<T>,
  ): this {
    this._events.on<T>(event, listener);
    return this;
  }

  off<T extends SpiderEventType>(
    event: T,
    listener: SpiderEventListener<T>,
  ): this {
    if (listener) {
      this._events.removeListener<T>(event, listener);
      return this;
    } else {
      this._events.removeAllListeners<T>(event);
      return this;
    }
  }

  protected updateStats(
    { request, requestMeta }: SpiderContext,
    error = false,
  ) {
    const type =
      requestMeta?.type ?? requestMeta?.headers['content-type'] ?? 'unknown';
    const status = requestMeta?.statusCode ?? -1;
    const host = new ParsedUrl(request.url).hostname.toLocaleLowerCase();
    const label = request.label ?? 'none';

    this.status.requestsByHost[host] ??= 0;
    this.status.requestsByLabel[label] ??= 0;
    this.status.requestsByStatus[status] ??= 0;
    this.status.requestsByType[type] ??= 0;

    this.status.requestsByHost[host]++;
    this.status.requestsByLabel[label]++;
    this.status.requestsByStatus[status]++;
    this.status.requestsByType[type]++;

    this.status.total = this.requestQueue?.assumedTotalCount ?? 0;
    if (error) this.status.failed++;
    this.status.finished++;
  }

  protected override async _cleanupContext(context: SpiderContext) {
    if (context.request.errorMessages.length === 0) {
      // We're finishing a request, and there were no errors.
      this.updateStats(context);
    } else {
      if (
        context.request.retryCount === this.crawlerOptions.maxRequestRetries
      ) {
        // It's a request with errors, and we're at the max retries; update the
        // stats because it's about to leave the queue.
        this.updateStats(context, true);
      }
      const errors = context.request.errorMessages;
      this.status.lastError = errors[errors.length];
    }

    // Even in the case of an error, we'll fire the event so that progress
    // indicators can be updated, etc.
    this._events.emit('progress', this.status, context.request.url);

    super._cleanupContext(context as PlaywrightCrawlingContext);
  }

  /**
   * Enqueue a set of URLs and crawl them using the current Spider options.
   */
  override async run(
    requests: RequestValue | RequestValue[] = [],
  ): Promise<SpiderStatus & FinalStatistics> {
    // If only a single value came in, turn it into an array.
    const project = await Spidergram.load();
    const graph = project.arango;
    requests = arrify(requests);

    // Crawlee has a lot of logs going on.
    // Long term we want to do something nicer here.
    this.config.set('logLevel', this.spiderOptions.logLevel);
    this.log.setLevel(this.spiderOptions.logLevel);
    log.setLevel(this.spiderOptions.logLevel);

    const queue = await this.getRequestQueue();

    // Normalize and deduplicate any incoming URLs.
    const currentNormalizer =
      this.spiderOptions.urls.normalizer ?? NormalizedUrl.normalizer;
    const uniques = new UniqueUrlSet(undefined, {
      normalizer: currentNormalizer,
      guessProtocol: true,
    });

    for (const value of requests) {
      if (is.string(value)) {
        uniques.add(value);
      } else if (is.urlInstance(value) || value instanceof UniqueUrl) {
        uniques.add(value);
      } else if (value instanceof Request) {
        uniques.add(value.url);
      } else if ('url' in value && is.string(value.url)) {
        uniques.add(value.url);
      }
    }
    await graph.push([...uniques], false);

    this.status.startTime = Date.now();

    await queue.addRequests([...uniques].map(uu => uniqueUrlToRequest(uu)));

    const results = await super.run();
    this.status.finishTime = Date.now();
    const finalStats = { ...this.status, ...results };
    this._events.emit('end', finalStats);
    await Dataset.open('crawl_stats').then(ds => ds.pushData(finalStats));
    return Promise.resolve(finalStats);
  }

  /**
   * Resume the crawl with saved-but-unvisited URLs.
   */
  async resume(urls: UniqueUrl[]) {
    this.status.startTime = Date.now();

    // Crawlee has a lot of logs going on.
    // Long term we want to do something nicer here.
    this.config.set('logLevel', this.spiderOptions.logLevel);
    this.log.setLevel(this.spiderOptions.logLevel);
    log.setLevel(this.spiderOptions.logLevel);

    const queue = await this.getRequestQueue();
    await queue.addRequests(urls.map(uu => uniqueUrlToRequest(uu)));

    const results = await super.run();
    this.status.finishTime = Date.now();
    const finalStats = { ...this.status, ...results };
    this._events.emit('end', finalStats);
    await Dataset.open('crawl_stats').then(ds => ds.pushData(finalStats));
    return Promise.resolve(finalStats);
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function splitOptions(options: Partial<SpiderOptions> = {}) {
  const internal = _.defaultsDeep(
    options,
    Spidergram.config.spider,
  ) as InternalSpiderOptions;

  // This strips out options we know conflict between our options and crawlee's
  const {
    seed,
    saveCookies,
    savePerformance,
    saveXhrList,
    auditAccessibility,
    logLevel,
    pageHandler,
    requestHandlers,
    urls: urlOptions,
    parseMimeTypes,
    downloadMimeTypes,
    preNavigationHooks,
    postNavigationHooks,
    userAgent,
    handlerTimeout,
    waitUntil,
    stealth,
    shadowDom,
    cookies,
    prefetchMethod,

    ...crawlerOptions
  } = internal;

  return {
    internal,
    crawler: crawlerOptions as PlaywrightCrawlerOptions,
  };
}
/* eslint-enable no-unused-vars */
