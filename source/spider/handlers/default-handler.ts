import { CombinedSpiderContext } from "../context.js";

export async function defaultHandler(context: CombinedSpiderContext) {
  const { $, saveResource, enqueueUrls } = context;
  await saveResource({ body: $?.html() });
  await enqueueUrls();
}