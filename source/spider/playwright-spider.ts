import is from '@sindresorhus/is';
import {
  PlaywrightCrawler,
  PlaywrightCrawlerOptions,
  PlaywrightCrawlingContext,
  Configuration,
  createPlaywrightRouter,
  playwrightUtils,
  CrawlerAddRequestsOptions,
  RequestOptions,
  FinalStatistics
} from 'crawlee';
import {
  SpiderOptions,
  SpiderContext,
  buildSpiderOptions,
  hooks,
  handlers,
  helpers,
  contextualizeHandler,
  contextualizeHook,
  uniqueUrlToRequest
} from './index.js';
import { UniqueUrl, UniqueUrlSet } from '../model/index.js';
import { NormalizedUrl } from '@autogram/url-tools';
import arrify from 'arrify';

type AddRequestValue = string | Request | RequestOptions | NormalizedUrl | UniqueUrl;
type PlaywrightSpiderOptions = PlaywrightCrawlerOptions & SpiderOptions;
type PlaywrightSpiderContext = PlaywrightCrawlingContext & SpiderContext;

export class PlaywrightSpider extends PlaywrightCrawler {
  spiderOptions: SpiderOptions;
  crawlerOptions: PlaywrightCrawlerOptions;

  constructor(
    options: Partial<PlaywrightSpiderOptions> = {},
    config?: Configuration,
  ) {
    const {crawler, spider} = helpers.splitOptions<PlaywrightCrawlerOptions, PlaywrightCrawlingContext>(options);

    spider.requestHandlers = {
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      page: handlers.defaultHandler,
      ...spider.requestHandlers,
    };

    const router = createPlaywrightRouter();
    router.addDefaultHandler(contextualizeHandler<PlaywrightCrawlingContext>(spider.requestHandlers.page));
    for (const h in spider.requestHandlers) {
      router.addHandler(h, contextualizeHandler<PlaywrightCrawlingContext>(spider.requestHandlers[h]));
    }

    crawler.requestHandler = router;

    crawler.preNavigationHooks = [
      contextualizeHook<PlaywrightCrawlingContext>(hooks.contextBuilder),
      contextualizeHook<PlaywrightCrawlingContext>(hooks.requestRouter),
      ...(crawler.preNavigationHooks ?? []).map(hook => contextualizeHook<PlaywrightCrawlingContext>(hook)),
    ];

    crawler.postNavigationHooks = [
      contextualizeHook<PlaywrightCrawlingContext>(playwrightPostNavigate),
      ...(crawler.postNavigationHooks ?? []).map(hook => contextualizeHook<PlaywrightCrawlingContext>(hook)),
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
  
    await this.spiderOptions.storage.push([...uniques], false);
    const queue = await this.getRequestQueue();
    await queue.addRequests([...uniques].map(uu => uniqueUrlToRequest(uu)), options);
  
    return super.run();
  }
}

async function playwrightPostNavigate(context: PlaywrightSpiderContext) {
  context.$ = await playwrightUtils.parseWithCheerio(context.page);
}
