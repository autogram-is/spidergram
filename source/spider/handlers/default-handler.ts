import { CombinedContext } from "../context.js";

export async function defaultHandler(context: CombinedContext) {
  const { $, saveResource, enqueueUrls } = context;
  context.resource = await saveResource({ body: $?.html() });
  await enqueueUrls();
}