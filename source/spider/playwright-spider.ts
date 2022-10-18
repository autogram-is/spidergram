import { SpiderContext, SpiderLocalContext, SpiderOptions, defaultSpiderOptions } from './options.js';
import { PlaywrightCrawler, PlaywrightCrawlerOptions, PlaywrightCrawlingContext, Configuration, createPlaywrightRouter, Awaitable, playwrightUtils } from "crawlee";
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

    // Create the Crawlee routers, handlers, and hooks. As with the constructor, 
    // we merge SpiderContext into the CrawlingContext. In theory we could let
    // handlers look up the static property themselves, but this mirrors the
    // standard Crawlee interface and keeps the handlers themselves a bit tidier.

    const router = createPlaywrightRouter();
    crawlerOptions.requestHandler = router;

    crawlerOptions.failedRequestHandler =
      (inputs: PlaywrightCrawlingContext, error: Error) => 
        handlers.failure({ ...inputs, ...PlaywrightSpider.context}, error);

    crawlerOptions.errorHandler =
      (inputs: PlaywrightCrawlingContext, error: Error) => 
        handlers.retry(inputs as PlaywrightSpiderContext, error);

    crawlerOptions.preNavigationHooks = [
      (context: PlaywrightCrawlingContext) => handlers.setup(context, PlaywrightSpider.context)
    ];

    super(crawlerOptions, config);

    if (requestHandler !== undefined) {
      this.addDefaultHandler(requestHandler);
    } else {
      this.addDefaultHandler(defaultHandler);
    }

    this.addHandler('download', handlers.download);
    this.addHandler('status', handlers.status);

    if (preNavigationHooks) this.preNavigationHooks.push(...preNavigationHooks)

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

  addHandler(label: string | symbol, handler: (ctx: PlaywrightSpiderContext) => Awaitable<void>) {
    if (this.router) {
      this.router.addHandler(label, (context) => handler(context as PlaywrightSpiderContext));
    } else {
      throw new Error('No router available');
    }
  }

  addDefaultHandler(handler: (ctx: PlaywrightSpiderContext) => Awaitable<void>) {
    if (this.router) {
      this.router.addDefaultHandler((context) => handler(context as PlaywrightSpiderContext));
    } else {
      throw new Error('No router available');
    }
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