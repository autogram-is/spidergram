import {
  PlaywrightCrawler,
  PlaywrightCrawlerOptions,
  PlaywrightCrawlingContext,
  Configuration,
  createPlaywrightRouter,
  playwrightUtils,
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
} from './index.js';

type PlaywrightSpiderOptions = PlaywrightCrawlerOptions & SpiderOptions;
type PlaywrightSpiderContext = PlaywrightCrawlingContext & SpiderContext;

export class PlaywrightSpider extends PlaywrightCrawler {
  spiderOptions: SpiderOptions;
  crawlerOptions: PlaywrightCrawlerOptions;

  constructor(
    options: Partial<PlaywrightSpiderOptions> = {},
    config?: Configuration,
  ) {
    const { crawler, spider } = helpers.splitOptions<PlaywrightCrawlerOptions, PlaywrightCrawlingContext>(options);

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

    super(crawler, config);

    this.spiderOptions = buildSpiderOptions(spider);
    this.crawlerOptions = crawler;
  }
}

async function playwrightPostNavigate(context: PlaywrightSpiderContext) {
  context.$ = await playwrightUtils.parseWithCheerio(context.page);
}
