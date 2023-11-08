import { SpiderContext } from '../context.js';

export async function statusHandler(context: SpiderContext): Promise<void> {
  return context.saveResource().then(() => void 0);
}
