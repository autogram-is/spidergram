import {CombinedContext} from '../context.js';
import {UniqueUrl} from '../../model/index.js';
import * as helpers from '../helpers/index.js';
import * as urls from '../links/index.js';
import {PlaywrightSpider} from '../playwright-spider.js';
import {CheerioSpider} from '../cheerio-spider.js';

export async function contextBuilder(context: CombinedContext): Promise<void> {
  const crawler = context.crawler as PlaywrightSpider | CheerioSpider;

  // Map our 'contextualized' functions to the context object
  Object.assign(context, {
    prefetchRequest: async () => helpers.prefetchRequest(context),

    saveResource: async (data?: Record<string, unknown>) =>
      helpers.saveResource(context, data),

    enqueueLinks: async (options?: urls.EnqueueUrlOptions) =>
      urls.enqueueLinks(context, options),

    findLinks: async (options?: urls.EnqueueUrlOptions) =>
      urls.find(context, options),

    saveLinks: async (input: urls.AnchorTagData[], options?: urls.EnqueueUrlOptions) =>
      urls.save(context, input, options),

    saveRequests: async (input: UniqueUrl[], options?: urls.EnqueueUrlOptions) =>
      urls.enqueue(context, input, options),

    ...crawler.spiderOptions,
  });

  return urls.saveCurrentUrl(context);
}
