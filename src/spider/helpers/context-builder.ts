import { Spider, SpiderContext } from '../index.js';
import { Spidergram, UniqueUrl } from '../../index.js';
import { helpers } from '../index.js';
import * as urls from '../links/index.js';
import { HtmlTools } from '../../index.js';

export async function enhanceSpiderContext(
  context: SpiderContext,
): Promise<void> {
  const crawler = context.crawler as Spider;
  const project = await Spidergram.init();

  // Map our 'contextualized' functions to the context object
  Object.assign(context, {
    prefetchRequest: async () => helpers.prefetchRequest(context),

    saveResource: async (data?: Record<string, unknown>) =>
      helpers.saveResource(context, data),

    enqueueUrls: async (options: Partial<urls.EnqueueUrlOptions> = {}) =>
      urls.enqueueUrls(context, options),

    findLinks: async (options: Partial<urls.EnqueueUrlOptions> = {}) =>
      urls.findUrls(context, options),

    saveLinks: async (
      input: HtmlTools.FoundLink[],
      options: Partial<urls.EnqueueUrlOptions> = {},
    ) => urls.saveUrls(context, input, options),

    saveRequests: async (
      input: UniqueUrl[],
      options: Partial<urls.EnqueueUrlOptions> = {},
    ) => urls.enqueueRequests(context, input, options),

    graph: project.arango,
    files: project.files,

    ...crawler.spiderOptions,
  });

  await urls.saveCurrentUrl(context);
}
