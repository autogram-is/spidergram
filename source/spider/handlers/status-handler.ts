import {CombinedSpiderContext} from '../context.js';

export async function statusHandler(context: CombinedSpiderContext): Promise<void> {
  await context.saveResource();
}
