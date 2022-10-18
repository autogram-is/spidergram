import { SpiderContext, SpiderLocalContext, SpiderOptions, defaultSpiderOptions } from './options.js';
import { CheerioCrawler, CheerioCrawlerOptions, CheerioCrawlingContext, Configuration, Awaitable, createCheerioRouter } from 'crawlee';
import { NormalizedUrl } from '@autogram/url-tools';
import * as handlers from './handlers/index.js';
import * as helpers from './spider-helper.js';

export interface CheerioSpiderOptions extends CheerioCrawlerOptions, SpiderOptions {}
export interface CheerioSpiderContext extends CheerioCrawlingContext, SpiderContext, SpiderLocalContext {}

export class CheerioSpider extends CheerioCrawler {
  static context: SpiderContext;

  constructor(
    options: Partial<CheerioCrawlerOptions> & Partial<CheerioSpiderOptions> = {},
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
      saveUnparsableUrls,

      requestHandler,
      failedRequestHandler,
      errorHandler,
      preNavigationHooks,

      ...crawlerOptions
    } = options;

    const router = createCheerioRouter();
    crawlerOptions.requestHandler = router;

    // Ensure our prenavigation hook gets in first
    crawlerOptions.preNavigationHooks = [
      (context: CheerioCrawlingContext) => handlers.setup<CheerioCrawlingContext>(context, CheerioSpider.context),
      ...preNavigationHooks ?? []
    ];

    crawlerOptions.failedRequestHandler =
      failedRequestHandler ??
      ((inputs: CheerioCrawlingContext, error: Error) => handlers.failure(inputs as CheerioSpiderContext, error));

    crawlerOptions.errorHandler =
      errorHandler ?? 
      ((inputs: CheerioCrawlingContext, error: Error) => handlers.retry(inputs as CheerioSpiderContext, error));

    super(crawlerOptions, config);
    
    if (requestHandler !== undefined) {
      this.addDefaultHandler(requestHandler);
    } else {
      this.addDefaultHandler(defaultHandler);
    }

    this.addHandler('download', handlers.download);
    this.addHandler('status', handlers.status);

    CheerioSpider.context = {
      storage: storage ?? defaultSpiderOptions.storage,
      linkSelectors: linkSelectors ?? defaultSpiderOptions.linkSelectors,
      urlNormalizer: urlNormalizer ?? defaultSpiderOptions.urlNormalizer,
      responseRules: {
        ...defaultSpiderOptions.responseRules,
        ...responseRules  
      },
      urlRules: {
        ...defaultSpiderOptions.urlRules,
        ...urlRules  
      },
      saveUnparsableUrls: saveUnparsableUrls ?? defaultSpiderOptions.saveUnparsableUrls,
      saveResource: defaultSpiderOptions.saveResource,
      saveLink: defaultSpiderOptions.saveLink,
    };
    NormalizedUrl.normalizer = CheerioSpider.context.urlNormalizer;
  }

  // Handlers are a little funky; in a perfect world we
  addHandler(label: string | symbol, handler: (ctx: CheerioSpiderContext) => Awaitable<void>) {
    if (this.router) {
      this.router.addHandler(label, (context) => handler(context as CheerioSpiderContext));
    } else {
      throw new Error('No router available');
    }
  }

  addDefaultHandler(handler: (ctx: CheerioSpiderContext) => Awaitable<void>) {
    if (this.router) {
      this.router.addDefaultHandler((context) => handler(context as CheerioSpiderContext));
    } else {
      throw new Error('No router available');
    }
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
        await q.addRequest(helpers.buildRequest(newUnique));
      }
    }
  }

  return Promise.resolve();
}