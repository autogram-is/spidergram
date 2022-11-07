import {PlaywrightGotoOptions} from 'crawlee';
import {Spider, SpiderContext} from '../index.js';
import {Project, UniqueUrl} from '../../index.js';
import {helpers} from '../index.js';
import * as urls from '../links/index.js';

export async function contextBuilder(context: SpiderContext, options?: PlaywrightGotoOptions): Promise<void> {
  const crawler = context.crawler as Spider;
  const project = await Project.context(context.projectConfig);

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

    graph: project.graph,
    files: project.files,

    ...crawler.spiderOptions,
  });

  await urls.saveCurrentUrl(context);
}
