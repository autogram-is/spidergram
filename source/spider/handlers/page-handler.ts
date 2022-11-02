import {CombinedSpiderContext} from '../context.js';

export async function pageHandler(context: CombinedSpiderContext) {
  const {$, saveResource, enqueueLinks} = context;
  await saveResource({body: $?.html()});
  await enqueueLinks();
}
