import { CombinedSpiderContext } from "../context.js";

export async function statusHandler(context: CombinedSpiderContext): Promise<void> {
  context.resource = await context.saveResource();
}