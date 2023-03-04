import { SpiderContext } from '../context.js';

export async function statusHandler(context: SpiderContext): Promise<void> {
  const { saveResource } = context;
  await saveResource();
  return Promise.resolve();
}
