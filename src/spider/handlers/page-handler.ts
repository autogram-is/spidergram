import { SpiderContext } from '../context.js';

export async function pageHandler(context: SpiderContext) {
  const { $, saveResource, enqueueUrls } = context;
  await saveResource({ body: $?.html() });

  await enqueueUrls();

  if (context.urlOptions.checkSitemaps) {
    await enqueueUrls({
      selector: 'head link [ref="sitemap"]',
      handler: 'sitemap',
    });
  }
  return Promise.resolve();
}
