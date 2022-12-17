import {Spider, SpiderContext} from '../index.js';
import {Project, UniqueUrl} from '../../index.js';
import {helpers} from '../index.js';
import * as urls from '../links/index.js';
import { HtmlTools } from '../../index.js';

export async function enhanceSpiderContext(context: SpiderContext): Promise<void> {
  const crawler = context.crawler as Spider;
  const project = await Project.config(context.projectConfig);
  
  // Map our 'contextualized' functions to the context object
  Object.assign(context, {
    prefetchRequest: async () => helpers.prefetchRequest(context),

    saveResource: async (data?: Record<string, unknown>) =>
      helpers.saveResource(context, data),

    enqueueUrls: async (options: Partial<urls.EnqueueUrlOptions> = {}) =>
      urls.enqueueUrls(context, options),

    findLinks: async (options: Partial<urls.EnqueueUrlOptions> = {}) =>
      urls.find(context, options),

    saveLinks: async (input: HtmlTools.FoundLink[], options: Partial<urls.EnqueueUrlOptions> = {}) =>
      urls.save(context, input, options),

    saveRequests: async (input: UniqueUrl[], options: Partial<urls.EnqueueUrlOptions> = {}) =>
      urls.enqueue(context, input, options),

    graph: await project.graph(),
    files: project.files,

    ...crawler.spiderOptions,
  });

  await urls.saveCurrentUrl(context);
}
