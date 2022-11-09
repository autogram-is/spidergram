import is from '@sindresorhus/is';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import arrify from 'arrify';
import path from 'node:path';
import { log } from 'crawlee';

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
import {NormalizedUrl, ParsedUrl} from '@autogram/url-tools';
import {Project} from '../services/project.js';
import {UniqueUrl, UniqueUrlSet} from '../model/index.js';
import {SpiderRequestHandler} from './handlers/index.js';
import {
  InternalSpiderOptions,
  SpiderOptions,
  SpiderContext,
  SpiderStatistics,
  buildSpiderOptions,
  hooks,
  handlers,
  contextualizeHandler,
  contextualizeHook,
  uniqueUrlToRequest,
  SpiderInternalStatistics,
} from './index.js';

type RequestValue = string | Request | RequestOptions | NormalizedUrl | UniqueUrl;

export const enum SpiderEventType {
  SYSTEM_INFO = 'systemInfo',
  REQUEST_COMPLETE = 'requestComplete',
  ABORTING = 'aborting',
  EXIT = 'exit',
}

export type SpiderEventName = SpiderEventType | 'systemInfo' | 'aborting' | 'exit' | 'requestComplete';

export class Spider extends PlaywrightCrawler {
  spiderOptions: InternalSpiderOptions;
  crawlerOptions: PlaywrightCrawlerOptions;
  progress: SpiderInternalStatistics = {
    requestsEnqueued: 0,
    requestsCompleted: 0,
    requestsByStatus: {},
    requestsByType: {},
    requestsByHost: {},
    requestsByLabel: {}
  }
  protected _events: AsyncEventEmitter;

  constructor(
    options: Partial<SpiderOptions> = {},
    config?: Configuration,
  ) {
    const {crawler, internal} = splitOptions(options);

    const requestHandlers: Record<string, SpiderRequestHandler> = {
      page: internal.pageHandler ?? handlers.pageHandler,
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      ...internal.requestHandlers,
    };

    const router = createPlaywrightRouter();
    router.addDefaultHandler(contextualizeHandler(requestHandlers.page));
    for (const h in requestHandlers) {
      router.addHandler(h, contextualizeHandler(requestHandlers[h]));
    }

    crawler.requestHandler = router;

    crawler.preNavigationHooks = [
      contextualizeHook(hooks.contextBuilder),
      contextualizeHook(hooks.defaultRouter),
      ...(internal.preNavigationHooks ?? []).map(hook => contextualizeHook(hook)),
    ];

    crawler.postNavigationHooks = [
      contextualizeHook(playwrightPostNavigate),
      ...(internal.postNavigationHooks ?? []).map(hook => contextualizeHook(hook)),
    ];


    super(crawler, config);

    this.spiderOptions = internal;
    this.crawlerOptions = crawler;

    this._events = new AsyncEventEmitter();
    //this.events.on(EventType.ABORTING, ({event, ...args}) => this.emit(event, ...args));
    //this.events.on(EventType.EXIT, ({event, ...args}) => this.emit(event, ...args));
    //this.events.on(EventType.SYSTEM_INFO, ({event, ...args}) => this.emit(event, ...args));
  }

  on(event: SpiderEventName, listener: (...args: any[]) => any): void {
    this._events.on(event, listener);
  }

  off(event: SpiderEventName, listener?: (...args: any[]) => any): void {
    if (listener) {
      this._events.removeListener(event, listener);
    } else {
      this._events.removeAllListeners(event);
    }
  } 

  emit(event: SpiderEventName, ...args: any[]): void {
    this._events.emit(event, ...args);
  }

  updateStats({request, requestMeta}: SpiderContext) {
    const type = requestMeta?.type ?? requestMeta?.headers['content-type'] ?? 'unknown';
    const status = requestMeta?.statusCode ?? -1;
    const host = new ParsedUrl(request.url).hostname.toLocaleLowerCase();
    const label = request.label ?? 'none';

    this.progress.requestsByHost[host] ??= 0;
    this.progress.requestsByLabel[label] ??= 0;
    this.progress.requestsByStatus[status] ??= 0;
    this.progress.requestsByType[type] ??= 0;

    this.progress.requestsByHost[host]++;
    this.progress.requestsByLabel[label]++;
    this.progress.requestsByStatus[status]++;
    this.progress.requestsByType[type]++;

    this.progress.requestsEnqueued = this.requestQueue?.assumedTotalCount ?? 0;
    this.progress.requestsCompleted++;
  }

  override async _cleanupContext(context: SpiderContext) {
    // This is pretty sketchy way of capturing a non-error; we need to verify that
    // a request that previously failed but then succeeded will still be noticed.
    if (context.request.errorMessages.length === 0) {
      this.updateStats(context);
    }

    // Even in the case of an error, we'll fire the event so that progress
    // indicators can be updated, etc.
    this.emit(
      SpiderEventType.REQUEST_COMPLETE,
      { ...this.progress, ...this.stats.calculate() } as SpiderStatistics,
      context.request.url
    );
  }

  /**
   * Description placeholder
   *
   * @override
   * @async
   * @param {(RequestValue | RequestValue[])} [requests=[]]
   * @param {?CrawlerAddRequestsOptions} [options]
   */
  override async run(
    requests: RequestValue | RequestValue[] = [],
    options?: CrawlerAddRequestsOptions,
  ): Promise<SpiderStatistics> {
    // If only a single value came in, turn it into an array.
    const project = await Project.config(this.spiderOptions.projectConfig);
    const graph = await project.graph;
    requests = arrify(requests);

    this.config.set('storageClientOptions',
      { optionallocalDataDirectory: path.join(project.root, 'crawler') }
    );
    
    // Crawlee has a lot of logs going on.
    // Long term we want to do something nicer here.
    this.config.set('logLevel', this.spiderOptions.logLevel);
    this.log.setLevel(this.spiderOptions.logLevel);
    log.setLevel(this.spiderOptions.logLevel);

    // Normalize and deduplicate any incoming requests.
    const uniques = new UniqueUrlSet(undefined, undefined, this.spiderOptions.urlOptions.normalizer);
    for (const value of requests) {
      if (is.string(value) || is.urlInstance(value) || value instanceof UniqueUrl) {
        uniques.add(value);
      } else if (value instanceof Request) {
        uniques.add(value.url);
      } else if ('url' in value && is.string(value.url)) {
        uniques.add(value.url);
      }
    }

    await graph.push([...uniques], false);
    const queue = await this.getRequestQueue();
    await queue.addRequests([...uniques].map(uu => uniqueUrlToRequest(uu)), options);

    return super.run()
      .then(stats => ({ ...stats, ...this.progress}));
  }
}

async function playwrightPostNavigate(context: SpiderContext) {
  context.$ = await playwrightUtils.parseWithCheerio(context.page);
}

function splitOptions(
  options: Partial<SpiderOptions> = {},
) {
  const {
    projectConfig,
    logLevel,
    defaultRouter,
    pageHandler,
    requestHandlers,
    urlOptions,
    parseMimeTypes,
    downloadMimeTypes,
    preNavigationHooks,
    postNavigationHooks,

    ...crawlerOptions
  } = options;

  return {
    internal: buildSpiderOptions(options),
    crawler: crawlerOptions as PlaywrightCrawlerOptions,
  };
}
