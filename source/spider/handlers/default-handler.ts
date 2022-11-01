import {CombinedSpiderContext} from '../context.js';

export async function defaultHandler(context: CombinedSpiderContext) {
  const {$, saveResource, enqueueLinks} = context;
  await saveResource({body: $?.html()});
  await enqueueLinks();
}
