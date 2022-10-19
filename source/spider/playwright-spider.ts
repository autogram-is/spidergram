import { SpiderContext, SpiderLocalContext, SpiderOptions, defaultSpiderOptions } from './options.js';
import { PlaywrightCrawler, PlaywrightCrawlerOptions, PlaywrightCrawlingContext, Configuration, createPlaywrightRouter, playwrightUtils } from "crawlee";
import { NormalizedUrl } from '@autogram/url-tools';
import * as handlers from './handlers/index.js';
import * as helpers from './spider-helper.js';

export interface PlaywrightSpiderOptions extends PlaywrightCrawlerOptions, SpiderOptions {}
export interface PlaywrightSpiderContext extends PlaywrightCrawlingContext, SpiderContext, SpiderLocalContext {}

export class PlaywrightSpider extends PlaywrightCrawler {
  static context: SpiderContext;

  constructor(
    options: Partial<PlaywrightSpiderOptions> = {},
    config?: Configuration
  ) {
    // Unpack SpiderOptions from PlaywrightCrawlerOptions; this is important,
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

    const router = createPlaywrightRouter();
    router.addDefaultHandler(context => (requestHandler ?? defaultHandler)(context as PlaywrightSpiderContext));
    router.addHandler('download', context => handlers.download(context as PlaywrightSpiderContext));
    router.addHandler('status', context => handlers.status(context as PlaywrightSpiderContext));
    crawlerOptions.requestHandler = router;

    // Ensure our prenavigation hook gets in first
    crawlerOptions.preNavigationHooks = [
      (context: PlaywrightCrawlingContext) => handlers.setup(context, PlaywrightSpider.context),
      ...preNavigationHooks ?? []
    ];

    crawlerOptions.failedRequestHandler =
      failedRequestHandler ??
      ((inputs: PlaywrightCrawlingContext, error: Error) => (failedRequestHandler ?? handlers.failure)(inputs as PlaywrightSpiderContext, error));

    crawlerOptions.errorHandler =
      errorHandler ?? 
      ((inputs: PlaywrightCrawlingContext, error: Error) => (errorHandler ?? handlers.retry)(inputs as PlaywrightSpiderContext, error));

    super(crawlerOptions, config);

    PlaywrightSpider.context = {
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
    NormalizedUrl.normalizer = PlaywrightSpider.context.urlNormalizer;
  }
}

async function defaultHandler(context: PlaywrightSpiderContext): Promise<void> {
  const {crawler, page, saveLink, saveResource, urlRules, linkSelectors} = context;

  const $ = await playwrightUtils.parseWithCheerio(page);
  context.resource = await saveResource(context, { body: $.html() });

  const q = await crawler.getRequestQueue();
  for (let link of await helpers.extractLinks($, linkSelectors)) {
    const newUnique = await saveLink(link, context);
    
    if (newUnique.parsable && urlRules.enqueue(newUnique.parsed!, context)) {
      await q.addRequest(helpers.buildRequest(newUnique));
    }
  }

  return Promise.resolve();
}