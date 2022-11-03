import is from '@sindresorhus/is';
import {
  PlaywrightCrawler,
  PlaywrightCrawlerOptions,
  Configuration,
  createPlaywrightRouter,
  playwrightUtils,
  CrawlerAddRequestsOptions,
  RequestOptions,
  FinalStatistics,
} from 'crawlee';

import {NormalizedUrl} from '@autogram/url-tools';
import arrify from 'arrify';
import {Project} from '../project.js';
import {UniqueUrl, UniqueUrlSet} from '../model/index.js';
import {SpiderRequestHandler} from './handlers/index.js';
import {
  InternalSpiderOptions,
  SpiderOptions,
  SpiderContext,
  buildSpiderOptions,
  hooks,
  handlers,
  contextualizeHandler,
  contextualizeHook,
  uniqueUrlToRequest,
} from './index.js';

type AddRequestValue = string | Request | RequestOptions | NormalizedUrl | UniqueUrl;

export class Spider extends PlaywrightCrawler {
  InternalSpiderOptions: InternalSpiderOptions;
  crawlerOptions: PlaywrightCrawlerOptions;

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

    this.InternalSpiderOptions = internal;
    this.crawlerOptions = crawler;
  }

  override async run(
    requests: AddRequestValue | AddRequestValue[] = [],
    options?: CrawlerAddRequestsOptions,
  ): Promise<FinalStatistics> {
    // If only a single value came in, turn it into an array.
    const context = await Project.context(this.InternalSpiderOptions.projectConfig);
    requests = arrify(requests);

    // Normalize and deduplicate any incoming requests.
    const uniques = new UniqueUrlSet(undefined, undefined, this.InternalSpiderOptions.urlOptions.normalizer);
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

    return super.run();
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
