import { SpiderContext } from '../context.js';
import {
  EnqueueUrlOptions,
  findUrls,
  saveUrls,
  enqueueRequests,
} from './index.js';

export async function enqueueUrls(
  context: SpiderContext,
  customOptions: EnqueueUrlOptions = {},
) {
  const links = findUrls(context, customOptions);
  return saveUrls(context, links, customOptions).then(async urls =>
    enqueueRequests(context, urls, customOptions),
  );
}
