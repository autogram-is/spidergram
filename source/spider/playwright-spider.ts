import { SpiderOptions, buildSpiderOptions } from './options.js';
import { SpiderContext } from './context.js';
import { PlaywrightCrawler, PlaywrightCrawlerOptions, PlaywrightCrawlingContext, Configuration, createPlaywrightRouter, playwrightUtils } from "crawlee";
import * as handlers from './handlers/index.js';
import * as helpers from './helpers/index.js';
import * as hooks from './hooks/index.js';

type PlaywrightSpiderOptions = PlaywrightCrawlerOptions & SpiderOptions;
type PlaywrightSpiderContext = PlaywrightCrawlingContext & SpiderContext {}

export class PlaywrightSpider extends PlaywrightCrawler {
  options: SpiderOptions;

  constructor(
    options: Partial<PlaywrightSpiderOptions> = {},
    config?: Configuration
  ) {
    let {
      storage,
      linkSelectors,
      urlRules,
      responseRules,
      urlNormalizer,
      skipUnparsableLinks,

      requestHandler,
      requestHandlers,
      failedRequestHandler,
      errorHandler,
      preNavigationHooks,
      postNavigationHooks,
      
      ...crawlerOptions
    } = options;


    requestHandlers = {
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      ...requestHandlers ?? {}
    }

    const router = createPlaywrightRouter();
    router.addDefaultHandler(helpers.wrapHandler<PlaywrightCrawlingContext>(requestHandler ?? defaultHandler));
    for (let h in requestHandlers) {
      router.addHandler(h, helpers.wrapHandler<PlaywrightCrawlingContext>(requestHandlers[h]));
    }
    crawlerOptions.requestHandler = router;

    crawlerOptions.preNavigationHooks = [
      hooks.contextualizeHelpers,
      hooks.requestRouter,
      ...(preNavigationHooks ?? []).map(hook => helpers.wrapHook(hook))
    ];

    crawlerOptions.postNavigationHooks = [
      helpers.wrapHook<PlaywrightCrawlingContext>(playwrightPostNavigate),
      ...(postNavigationHooks ?? []).map(hook => helpers.wrapHook<PlaywrightCrawlingContext>(hook))
    ];

    super(crawlerOptions, config);

    this.options = buildSpiderOptions(options);
  }
}

async function playwrightPostNavigate(context: PlaywrightSpiderContext) {
  context.$ = await playwrightUtils.parseWithCheerio(context.page);
}