import { CombinedSpiderContext } from "../context.js";
import { UniqueUrl } from "../../model/index.js";
import * as helpers from '../helpers/index.js';
import { PlaywrightSpider } from "../playwright-spider.js";
import { CheerioSpider } from "../cheerio-spider.js";

export async function contextBuilder(context: CombinedSpiderContext) {
  const crawler = context.crawler as PlaywrightSpider | CheerioSpider;
  
  // Map our 'contextualized' functions to the context object
  Object.assign(context, {
    prefetchRequest: () => helpers.prefetchRequest(context),
    saveResource: (data?: Record<string, unknown>) => 
      helpers.saveResource(context as CombinedSpiderContext, data),

    enqueueUrls: (options?: helpers.UrlDiscoveryOptions) =>
      helpers.enqueueUrls(context as CombinedSpiderContext, options),

    findUrls: (options?: helpers.UrlDiscoveryOptions) =>
      helpers.findUrls(context as CombinedSpiderContext, options),

    saveUrls: (links: helpers.HtmlLink[], options?: helpers.UrlDiscoveryOptions) =>
      helpers.saveUrls(links, context as CombinedSpiderContext, options),

    buildRequests: (urls: UniqueUrl[], options?: helpers.UrlDiscoveryOptions) =>
      helpers.saveRequests(urls, context as CombinedSpiderContext, options),
    
    ...crawler.options
  });

  helpers.saveCurrentUrl(context);
}
