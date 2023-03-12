import { SpiderContext } from '../context.js';

export async function pageHandler(context: SpiderContext) {
  const { $, saveResource, enqueueUrls } = context;
  await saveResource({ body: $?.html() });

  await enqueueUrls();

  return Promise.resolve();
}
