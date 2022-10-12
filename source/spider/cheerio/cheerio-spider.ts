import { Arango } from '../../arango-store.js';
import { SpiderContext, UrlRules, UrlMutatorWithContext, LinkSelectors, ResponseRules, defaultContext } from '../context.js';
import { CheerioCrawler, CheerioCrawlerOptions, Configuration } from 'crawlee';
import { NormalizedUrl } from '@autogram/url-tools';
import { CheerioSpiderHandlers } from './cheerio-spider-handlers.js';

export interface CheerioSpiderOptions {
  storage: Arango,
  linkSelectors: LinkSelectors,
  urlNormalizer: UrlMutatorWithContext,
  saveUnparsableUrls: boolean,
  urlRules: Partial<UrlRules>;
  responseRules: Partial<ResponseRules>;
}

export class CheerioSpider extends CheerioCrawler {
  protected static context: SpiderContext;

  constructor(options: Partial<CheerioCrawlerOptions> & Partial<CheerioSpiderOptions> = {}, config?: Configuration) {
    const {
      storage,
      linkSelectors,
      urlRules,
      responseRules,
      urlNormalizer,
      saveUnparsableUrls,
      ...crawleeOptions
    } = options;

    const handlers = new CheerioSpiderHandlers();
    
    crawleeOptions.requestHandler ??= (input) => handlers.requestHandler(input, CheerioSpider.context);
    crawleeOptions.failedRequestHandler ??= (input, error) => handlers.failureHandler(input, error, CheerioSpider.context);

    super(crawleeOptions, config);

    CheerioSpider.context = {
      storage: storage ?? defaultContext.storage,
      linkSelectors: linkSelectors ?? defaultContext.linkSelectors,
      urlNormalizer: urlNormalizer ?? defaultContext.urlNormalizer,
      responseRules: {
        ...defaultContext.responseRules,
        ...responseRules  
      },
      urlRules: {
        ...defaultContext.urlRules,
        ...urlRules  
      },
      saveUnparsableUrls: saveUnparsableUrls ?? defaultContext.saveUnparsableUrls,
    };

    NormalizedUrl.normalizer = CheerioSpider.context.urlNormalizer;
  }
}
