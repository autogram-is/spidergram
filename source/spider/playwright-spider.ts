import {
  PlaywrightCrawler,
  PlaywrightCrawlerOptions,
  PlaywrightCrawlingContext,
  Configuration,
  createPlaywrightRouter,
  playwrightUtils
} from "crawlee";
import {
  SpiderOptions,
  SpiderContext,
  buildSpiderOptions,
  hooks,
  helpers,
  handlers
} from './index.js';

type PlaywrightSpiderOptions = PlaywrightCrawlerOptions & SpiderOptions;
type PlaywrightSpiderContext = PlaywrightCrawlingContext & SpiderContext;

export class PlaywrightSpider extends PlaywrightCrawler {
  options: SpiderOptions;

  constructor(
    options: Partial<PlaywrightSpiderOptions> = {},
    config?: Configuration
  ) {
    let {
      storage,
      requestRouter,
      requestHandlers,
      urlDiscoveryOptions,
      urlNormalizer,
    
      requestHandler,
      preNavigationHooks,
      
      ...crawlerOptions
    } = options;

    requestHandlers = {
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      page: handlers.defaultHandler,
      ...requestHandlers ?? {}
    }

    const router = createPlaywrightRouter();
    router.addDefaultHandler(helpers.wrapHandler<PlaywrightCrawlingContext>(requestHandlers.page));
    for (let h in requestHandlers) {
      router.addHandler(h, helpers.wrapHandler<PlaywrightCrawlingContext>(requestHandlers[h]));
    }
    crawlerOptions.requestHandler = router;

    crawlerOptions.preNavigationHooks = [
      hooks.contextBuilder,
      hooks.requestRouter,
      ...(preNavigationHooks ?? []).map(hook => helpers.wrapHook(hook))
    ];

    super(crawlerOptions, config);

    this.options = buildSpiderOptions(options);
  }
}

async function playwrightPostNavigate(context: PlaywrightSpiderContext) {
  context.$ = await playwrightUtils.parseWithCheerio(context.page);
}