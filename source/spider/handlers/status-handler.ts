import {SpiderContext} from '../context.js';

export async function statusHandler(context: SpiderContext): Promise<void> {
  await context.saveResource();
}
