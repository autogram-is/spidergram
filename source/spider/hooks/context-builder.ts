import { CombinedContext } from "../context.js";
import { UniqueUrl } from "../../model/index.js";
import * as helpers from '../helpers/index.js';
import { PlaywrightSpider } from "../playwright-spider.js";
import { CheerioSpider } from "../cheerio-spider.js";

export async function contextBuilder(context: CombinedContext) {
  const crawler = context.crawler as PlaywrightSpider | CheerioSpider;
  
  // Map our 'contextualized' functions to the context object
  Object.assign(context, {
    prefetchRequest: () => helpers.prefetchRequest(context),
    saveResource: (data?: Record<string, unknown>) => 
      helpers.saveResource(context as CombinedContext, data),

    enqueueUrls: (options?: helpers.UrlDiscoveryOptions) =>
      helpers.enqueueUrls(context as CombinedContext, options),

    findUrls: (options?: helpers.UrlDiscoveryOptions) =>
      helpers.findUrls(context as CombinedContext, options),

    saveUrls: (links: helpers.HtmlLink[], options?: helpers.UrlDiscoveryOptions) =>
      helpers.saveUrls(links, context as CombinedContext, options),

    buildRequests: (urls: UniqueUrl[], options?: helpers.UrlDiscoveryOptions) =>
      helpers.saveRequests(urls, context as CombinedContext, options),
    
    ...crawler.options,
  });

  helpers.saveCurrentUrl(context);
}
