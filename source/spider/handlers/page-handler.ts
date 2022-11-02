import {SpiderContext} from '../context.js';

export async function pageHandler(context: SpiderContext) {
  const {$, saveResource, enqueueLinks} = context;
  await saveResource({body: $?.html()});
  await enqueueLinks();
}
