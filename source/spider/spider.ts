import is from '@sindresorhus/is';
import {
  PlaywrightCrawler,
  PlaywrightCrawlerOptions,
  Configuration,
  createPlaywrightRouter,
  playwrightUtils,
  CrawlerAddRequestsOptions,
  RequestOptions,
  FinalStatistics
} from 'crawlee';
import {
  SpiderOptions,
  CombinedOptions,
  CombinedSpiderContext,
  buildSpiderOptions,
  hooks,
  handlers,
  helpers,
  contextualizeHandler,
  contextualizeHook,
  uniqueUrlToRequest
} from './index.js';

import { Project } from '../project.js';
import { UniqueUrl, UniqueUrlSet } from '../model/index.js';
import { NormalizedUrl } from '@autogram/url-tools';
import arrify from 'arrify';

type AddRequestValue = string | Request | RequestOptions | NormalizedUrl | UniqueUrl;

export class Spider extends PlaywrightCrawler {
  spiderOptions: SpiderOptions;
  crawlerOptions: PlaywrightCrawlerOptions;

  constructor(
    options: Partial<CombinedOptions> = {},
    config?: Configuration,
  ) {
    const {crawler, spider} = helpers.splitOptions(options);

    spider.requestHandlers = {
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      page: handlers.defaultHandler,
      ...spider.requestHandlers,
    };

    const router = createPlaywrightRouter();
    router.addDefaultHandler(contextualizeHandler(spider.requestHandlers.page));
    for (const h in spider.requestHandlers) {
      router.addHandler(h, contextualizeHandler(spider.requestHandlers[h]));
    }

    crawler.requestHandler = router;

    crawler.preNavigationHooks = [
      contextualizeHook(hooks.contextBuilder),
      contextualizeHook(hooks.defaultRouter),
      ...(spider.preNavigationHooks ?? []).map(hook => contextualizeHook(hook)),
    ];

    crawler.postNavigationHooks = [
      contextualizeHook(playwrightPostNavigate),
      ...(spider.postNavigationHooks ?? []).map(hook => contextualizeHook(hook)),
    ];

    // This doesn't receive our properly-populated CrawlingContext; deal with that later.
    // crawler.failedRequestHandler ??= contextualizeHandler<PlaywrightCrawlingContext>(handlers.failureHandler);

    super(crawler, config);

    this.spiderOptions = buildSpiderOptions(spider);
    this.crawlerOptions = crawler;
  }

  override async run(
    requests: AddRequestValue | AddRequestValue[] = [],
    options?: CrawlerAddRequestsOptions
  ): Promise<FinalStatistics> {
    // If only a single value came in, turn it into an array.
    const context = await Project.context(this.spiderOptions.projectConfig);
    requests = arrify(requests);

    // Normalize and deduplicate any incoming requests.
    const uniques = new UniqueUrlSet(undefined, undefined, this.spiderOptions.urlOptions.normalizer);
    for (const value of requests) {
      if (is.string(value) || is.urlInstance(value) || value instanceof UniqueUrl ) {
        uniques.add(value);
      } else if (value instanceof Request) {
        uniques.add(value.url);
      } else if ('url' in value && is.string(value.url)) {
        uniques.add(value.url)
      }
    }
  
    await context.graph.push([...uniques], false);
    const queue = await this.getRequestQueue();
    await queue.addRequests([...uniques].map(uu => uniqueUrlToRequest(uu)), options);
  
    return super.run();
  }
}

async function playwrightPostNavigate(context: CombinedSpiderContext) {
  context.$ = await playwrightUtils.parseWithCheerio(context.page);
}
