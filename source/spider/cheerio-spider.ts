import {
  CheerioCrawler,
  CheerioCrawlerOptions,
  CheerioCrawlingContext,
  Configuration,
  createCheerioRouter,
} from 'crawlee';
import {
  SpiderOptions,
  hooks,
  handlers,
  helpers,
  contextualizeHook,
  contextualizeHandler,
} from './index.js';

export type Cheeriospider = CheerioCrawlerOptions & SpiderOptions;

export class CheerioSpider extends CheerioCrawler {
  spiderOptions: SpiderOptions;
  crawlerOptions: CheerioCrawlerOptions;

  constructor(
    options: Partial<Cheeriospider> = {},
    config?: Configuration,
  ) {
    const {crawler, spider} = helpers.splitOptions<CheerioCrawlerOptions, CheerioCrawlingContext>(options);

    spider.requestHandlers = {
      download: handlers.downloadHandler,
      status: handlers.statusHandler,
      page: handlers.defaultHandler,
      ...spider.requestHandlers,
    };

    crawler.additionalMimeTypes = [
      ...crawler.additionalMimeTypes ?? [],
      ...spider.downloadMimeTypes ?? [],
      ...spider.parseMimeTypes ?? [],
    ];

    const router = createCheerioRouter();
    router.addDefaultHandler(contextualizeHandler<CheerioCrawlingContext>(spider.requestHandlers.page));
    for (const h in spider.requestHandlers) {
      router.addHandler(h, contextualizeHandler<CheerioCrawlingContext>(spider.requestHandlers[h]));
    }

    crawler.requestHandler = router;

    crawler.preNavigationHooks = [
      contextualizeHook<CheerioCrawlingContext>(hooks.contextBuilder),
      contextualizeHook<CheerioCrawlingContext>(hooks.requestRouter),
      ...(crawler.preNavigationHooks ?? []).map(hook => contextualizeHook<CheerioCrawlingContext>(hook)),
    ];

    crawler.postNavigationHooks = (crawler.postNavigationHooks ?? [])
      .map(hook => contextualizeHook<CheerioCrawlingContext>(hook));

    super(crawler, config);

    this.spiderOptions = spider;
    this.crawlerOptions = crawler;
  }
}
