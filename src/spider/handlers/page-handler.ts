import { SpiderContext } from '../context.js';

export async function pageHandler(context: SpiderContext) {
  const { saveResource, enqueueUrls, page } = context;

  const body = await page.content();
  const cookies = context.saveCookies ? await page.context().cookies() : undefined

  await saveResource({ body, cookies });
  await enqueueUrls();

  return Promise.resolve();
}
