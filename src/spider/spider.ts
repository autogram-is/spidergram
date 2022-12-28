import is from '@sindresorhus/is';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import arrify from 'arrify';
import { log, PlaywrightCrawlingContext } from 'crawlee';
import prependHttp from 'prepend-http';
import { FinalStatistics } from 'crawlee';
import _ from 'lodash';

// We have a chance to set the log level HIGHER when configuring,
// but this (hopefully) ensures that sub-logs won't be created
// at the higher level elsewhere.
log.setLevel(log.LEVELS.OFF);

import {
  PlaywrightCrawler,
  PlaywrightCrawlerOptions,
  Configuration,
  createPlaywrightRouter,
  playwrightUtils,
  CrawlerAddRequestsOptions,
  RequestOptions,
} from 'crawlee';
import { NormalizedUrl, ParsedUrl } from '@autogram/url-tools';
import { Project } from '../services/project.js';
import { UniqueUrl, UniqueUrlSet } from '../model/index.js';
import { SpiderRequestHandler } from './handlers/index.js';
import {
  InternalSpiderOptions,
  SpiderOptions,
  SpiderContext,
  defaultSpiderOptions,
  handlers,
  helpers,
  contextualizeHandler,
  contextualizeHook,
  uniqueUrlToRequest,
  SpiderStatus,
} from './index.js';

type RequestValue =
  | string
  | Request
  | RequestOptions
  | NormalizedUrl
  | UniqueUrl;

export const enum SpiderEventType {
  SYSTEM_INFO = 'systemInfo',
  REQUEST_COMPLETE = 'requestComplete',
  ABORTING = 'aborting',
  EXIT = 'exit',
}

export type SpiderEventName =
  | SpiderEventType
  | 'systemInfo'
  | 'aborting'
  | 'exit'
  | 'requestComplete';

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
  protected _events: AsyncEventEmitter;

  constructor(options: Partial<SpiderOptions> = {}, config?: Configuration) {
    const { crawler, internal } = splitOptions(options);

    const requestHandlers: Record<string, SpiderRequestHandler> = {
      page: internal.pageHandler ?? handlers.pageHandler,
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      sitemap: handlers.sitemapHandler,
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

    crawler.postNavigationHooks = [
      contextualizeHook(playwrightPostNavigate),
      ...(internal.postNavigationHooks ?? []).map(hook =>
        contextualizeHook(hook),
      ),
    ];

    crawler.failedRequestHandler = async (
      ctx: PlaywrightCrawlingContext,
      error: Error,
    ): Promise<void> =>
      handlers.failureHandler(ctx as unknown as SpiderContext, error);

    if (internal.userAgent) {
      crawler.launchContext = { userAgent: internal.userAgent };
    }

    super(crawler, config);

    this.spiderOptions = internal;
    this.crawlerOptions = crawler;

    this._events = new AsyncEventEmitter();
  }

  protected override async _runRequestHandler(
    context: PlaywrightCrawlingContext,
  ) {
    await helpers.enhanceSpiderContext(context as SpiderContext);
    await helpers.requestPrecheck(context as SpiderContext);
    await super._runRequestHandler(context);
  }

  on(event: SpiderEventName, listener: (...args: unknown[]) => unknown): void {
    this._events.on(event, listener);
  }

  off(event: SpiderEventName, listener?: (...args: unknown[]) => unknown): void {
    if (listener) {
      this._events.removeListener(event, listener);
    } else {
      this._events.removeAllListeners(event);
    }
  }

  emit(event: SpiderEventName, ...args: unknown[]): void {
    this._events.emit(event, ...args);
  }

  updateStats({ request, requestMeta }: SpiderContext) {
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
    this.status.finished++;
  }

  override async _cleanupContext(context: SpiderContext) {
    // This is pretty sketchy way of capturing a non-error; we need to verify that
    // a request that previously failed but then succeeded will still be noticed.
    if (context.request.errorMessages.length === 0) {
      this.updateStats(context);
    } else {
      const errors = context.request.errorMessages;
      this.status.lastError = errors[errors.length];
    }

    // Even in the case of an error, we'll fire the event so that progress
    // indicators can be updated, etc.
    this.emit(
      SpiderEventType.REQUEST_COMPLETE,
      this.status,
      context.request.url,
    );

    super._cleanupContext(context as PlaywrightCrawlingContext);
  }

  override async run(
    requests: RequestValue | RequestValue[] = [],
    options?: CrawlerAddRequestsOptions,
  ): Promise<SpiderStatus & FinalStatistics> {
    // If only a single value came in, turn it into an array.
    const project = await Project.config(this.spiderOptions.projectConfig);
    const graph = await project.graph();
    requests = arrify(requests);

    // Crawlee has a lot of logs going on.
    // Long term we want to do something nicer here.
    this.config.set('logLevel', this.spiderOptions.logLevel);
    this.log.setLevel(this.spiderOptions.logLevel);
    log.setLevel(this.spiderOptions.logLevel);

    // Normalize and deduplicate any incoming requests.
    const uniques = new UniqueUrlSet();
    for (const value of requests) {
      if (is.string(value)) {
        // We assume these are at least somewhat web-url-like if they're passed in,
        // but might not have a protocol.
        uniques.add(prependHttp(value));
      } else if (is.urlInstance(value) || value instanceof UniqueUrl) {
        uniques.add(value);
      } else if (value instanceof Request) {
        uniques.add(value.url);
      } else if ('url' in value && is.string(value.url)) {
        uniques.add(value.url);
      }
    }

    this.status.startTime = Date.now();

    await graph.push([...uniques], false);
    const queue = await this.getRequestQueue();
    await queue.addRequests(
      [...uniques].map(uu => uniqueUrlToRequest(uu)),
      options,
    );

    return super.run().then(stats => {
      this.status.finishTime = Date.now();
      return { ...this.status, ...stats };
    });
  }
}

async function playwrightPostNavigate(context: SpiderContext) {
  context.$ = await playwrightUtils.parseWithCheerio(context.page);
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function splitOptions(options: Partial<SpiderOptions> = {}) {
  const {
    projectConfig,
    logLevel,
    pageHandler,
    requestHandlers,
    urlOptions,
    parseMimeTypes,
    downloadMimeTypes,
    preNavigationHooks,
    postNavigationHooks,
    userAgent,

    ...crawlerOptions
  } = options;

  return {
    internal: _.defaultsDeep(
      options,
      defaultSpiderOptions,
    ) as InternalSpiderOptions,
    crawler: crawlerOptions as PlaywrightCrawlerOptions,
  };
}
/* eslint-enable no-unused-vars */

