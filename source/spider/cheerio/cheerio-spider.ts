import { Arango } from '../../arango.js';
import { SpiderContext, UrlRules, UrlMutatorWithContext, LinkSelectors, ResponseRules, defaultContext } from '../context.js';
import { CheerioCrawler, CheerioCrawlerOptions, Configuration } from 'crawlee';
import { cheerioSpiderRequestHandler, cheerioSpiderFailureHandler } from './request-handlers.js';
import { NormalizedUrl } from '@autogram/url-tools';

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
    
    crawleeOptions.requestHandler ??= (input) => cheerioSpiderRequestHandler(input, CheerioSpider.context);
    crawleeOptions.failedRequestHandler ??= (input, error) => cheerioSpiderFailureHandler(input, error, CheerioSpider.context);

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
