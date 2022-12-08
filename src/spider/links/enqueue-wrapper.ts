import _ from 'lodash';
import {SpiderContext} from '../context.js';
import {EnqueueUrlOptions, find, save, enqueue} from './index.js';

export async function enqueueUrls(
  context: SpiderContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  return find(context, customOptions)
    .then(async links => save(context, links, customOptions))
    .then(async urls => enqueue(context, urls, customOptions));
}
