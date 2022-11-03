import is from '@sindresorhus/is';
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
import arrify from 'arrify';
import {Project} from '../project.js';
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

export class Spider extends PlaywrightCrawler {
  spiderOptions: InternalSpiderOptions;
  crawlerOptions: PlaywrightCrawlerOptions;
  progress: SpiderInternalStatistics = {
    requestsByStatus: {},
    requestsByType: {},
    requestsByHost: {},
    requestsByLabel: {}
  }

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

    // This doesn't receive our properly-populated CrawlingContext; deal with that later.
    // crawler.failedRequestHandler ??= contextualizeHandler(handlers.failureHandler);

    super(crawler, config);

    this.spiderOptions = internal;
    this.crawlerOptions = crawler;
  }

  updateStats({request, requestMeta}: SpiderContext) {
    const type = requestMeta?.headers['content-type'] ?? 'unknown';
    const status = requestMeta?.statusCode ?? -1;
    const host = new ParsedUrl(request.url).hostname;
    const label = request.label ?? 'none';

    this.progress.requestsByHost[host]++;
    this.progress.requestsByLabel[label]++;
    this.progress.requestsByStatus[status]++;
    this.progress.requestsByType[type]++;
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
    const context = await Project.context(this.spiderOptions.projectConfig);
    requests = arrify(requests);

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

    await context.graph.push([...uniques], false);
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
