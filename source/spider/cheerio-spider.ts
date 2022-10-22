import {
  CheerioCrawler,
  CheerioCrawlerOptions,
  CheerioCrawlingContext,
  Configuration,
  createCheerioRouter
} from "crawlee";
import {
  SpiderOptions,
  buildSpiderOptions,
  hooks,
  helpers,
  handlers
} from './index.js';

type CheerioSpiderOptions = CheerioCrawlerOptions & SpiderOptions;

export class CheerioSpider extends CheerioCrawler {
  options: SpiderOptions;

  constructor(
    options: Partial<CheerioSpiderOptions> = {},
    config?: Configuration
  ) {
    let {
      storage,
      requestRouter,
      requestHandlers,
      urlDiscoveryOptions,,
      urlNormalizer,
    
      requestHandler,
      preNavigationHooks,
      postNavigationHooks,
      
      ...crawlerOptions
    } = options;

    requestHandlers = {
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      page: handlers.defaultHandler,
      ...requestHandlers ?? {}
    }

    const router = createCheerioRouter();
    router.addDefaultHandler(helpers.wrapHandler<CheerioCrawlingContext>(requestHandlers.page));
    for (let h in requestHandlers) {
      router.addHandler(h, helpers.wrapHandler<CheerioCrawlingContext>(requestHandlers[h]));
    }
    crawlerOptions.requestHandler = router;

    crawlerOptions.preNavigationHooks = [
      hooks.contextBuilder,
      hooks.requestRouter,
      ...(preNavigationHooks ?? []).map(hook => helpers.wrapHook(hook))
    ];

    crawlerOptions.postNavigationHooks = [
      ...(postNavigationHooks ?? []).map(hook => helpers.wrapHook<CheerioCrawlingContext>(hook))
    ];

    super(crawlerOptions, config);
    this.options = buildSpiderOptions(options);
  }
}