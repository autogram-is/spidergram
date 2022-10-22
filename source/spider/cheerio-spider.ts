import { SpiderOptions, buildSpiderOptions } from './options.js';
import { SpiderContext } from './context.js';
import { CheerioCrawler, CheerioCrawlerOptions, CheerioCrawlingContext, Configuration, createCheerioRouter } from 'crawlee';
import * as handlers from './handlers/index.js';
import * as helpers from './helpers/index.js';

export interface CheerioSpiderOptions extends CheerioCrawlerOptions, SpiderOptions {}
export interface CheerioSpiderContext extends CheerioCrawlingContext, SpiderContext {}

export class CheerioSpider extends CheerioCrawler {
  options: SpiderOptions;

  constructor(
    options: Partial<CheerioSpiderOptions> = {},
    config?: Configuration
  ) {
    // Unpack SpiderOptions from CheerioCrawlerOptions; this is important,
    // because Crawlee errors on unknown options options instead of ignoring.
    const {
      storage,
      linkSelectors,
      urlRules,
      responseRules,
      urlNormalizer,
      skipUnparsableLinks,

      requestHandler,
      failedRequestHandler,
      errorHandler,
      preNavigationHooks,

      ...crawlerOptions
    } = options;

    const router = createCheerioRouter();
    router.addDefaultHandler(context => (requestHandler ?? defaultHandler)(context as CheerioSpiderContext));
    router.addHandler('download', context => handlers.downloadHandler(context as CheerioSpiderContext));
    router.addHandler('status', context => handlers.statusHandler(context as CheerioSpiderContext));
    crawlerOptions.requestHandler = router;

    // Ensure our prenavigation hook gets in first
    crawlerOptions.preNavigationHooks = [
      (context: CheerioCrawlingContext) => handlers.setup(context, CheerioSpider.context),
      ...preNavigationHooks ?? []
    ];

    super(crawlerOptions, config);
    this.options = buildSpiderOptions(options);
  }
}

async function defaultHandler(context: CheerioSpiderContext): Promise<void> {
  const {request, crawler, $, urlRules, linkSelectors} = context;

  context.resource = await helpers.saveResource(context, { body: $.html() });

  if (request.label === 'parse') {
    context.resource = await helpers.saveResource(context, { body: $.html() });
    const q = await crawler.getRequestQueue();
    for (let link of await helpers.extractLinks($, linkSelectors)) {
      const newUnique = await helpers.saveLink(link, context);
      
      if (newUnique.parsable && urlRules.enqueue(newUnique.parsed!, context)) {
        await q.addRequest(helpers.uniqueUrlRequest(newUnique));
      }
    }
  }

  return Promise.resolve();
}