import {CombinedContext} from '../context.js';

export async function statusHandler(context: CombinedContext): Promise<void> {
  context.resource = await context.saveResource();
}
