import { CombinedSpiderContext, SupportedCrawlingContext } from "../context.js";
import * as helpers from '../helpers/index.js';
import { UniqueUrl } from "../../model/index.js";

export async function contextualizeHelpers(ctx: SupportedCrawlingContext) {
  Object.assign(ctx, {
    saveCurrentUrl: () =>
      helpers.saveCurrentUrl(ctx as CombinedSpiderContext),

    saveResource: (data?: Record<string, unknown>) => 
      helpers.saveResource(ctx as CombinedSpiderContext, data),

    enqueueUrls: (options?: helpers.UrlDiscoveryOptions) =>
      helpers.enqueueUrls(ctx as CombinedSpiderContext, options),

    findUrls: (options?: helpers.UrlDiscoveryOptions) =>
      helpers.findUrls(ctx as CombinedSpiderContext, options),

    saveUrls: (links: helpers.HtmlLink[], options?: helpers.UrlDiscoveryOptions) =>
      helpers.saveUrls(links, ctx as CombinedSpiderContext, options),

    buildRequests: (urls: UniqueUrl[], options?: helpers.UrlDiscoveryOptions) =>
      helpers.saveRequests(urls, ctx as CombinedSpiderContext, options),
  });
  
  
}
