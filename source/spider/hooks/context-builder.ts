import {CombinedContext} from '../context.js';
import {UniqueUrl} from '../../model/index.js';
import * as helpers from '../helpers/index.js';
import * as urls from '../url-tools/index.js';
import {PlaywrightSpider} from '../playwright-spider.js';
import {CheerioSpider} from '../cheerio-spider.js';

export async function contextBuilder(context: CombinedContext): Promise<void> {
  const crawler = context.crawler as PlaywrightSpider | CheerioSpider;

  // Map our 'contextualized' functions to the context object
  Object.assign(context, {
    prefetchRequest: async () => helpers.prefetchRequest(context),

    saveResource: async (data?: Record<string, unknown>) =>
      helpers.saveResource(context, data),

    enqueueLinks: (options?: urls.EnqueueUrlOptions) =>
      urls.enqueue(context, options),

    findUrls: (options?: urls.EnqueueUrlOptions) =>
      urls.findUrls(context, options),

    saveUrls: (input: urls.HtmlLink[], options?: urls.EnqueueUrlOptions) =>
      urls.saveUrls(input, context, options),

    saveRequests: (input: UniqueUrl[], options?: urls.EnqueueUrlOptions) =>
      urls.saveRequests(input, context, options),

    ...crawler.spiderOptions,
  });

  return urls.saveCurrentUrl(context);
}
