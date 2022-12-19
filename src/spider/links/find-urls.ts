import is from '@sindresorhus/is';
import {SpiderContext} from '../context.js';
import {EnqueueUrlOptions} from './index.js';
import { HtmlTools } from '../../index.js';
import _ from 'lodash';

export function find(
  context: SpiderContext,
  customOptions?: Partial<EnqueueUrlOptions>,
) {
  const options: EnqueueUrlOptions = _.defaultsDeep(customOptions, context.urlOptions);
  const {
    label,
    selector,
    discardAnchorOnlyLinks,
    discardEmptyLinks,
  } = options;
  const {$} = context;

  const results: HtmlTools.FoundLink[] = [];
  if (!is.undefined($)) {
    for (const link of HtmlTools.findLinks($, selector)) {
      if (
        link !== undefined
        && !(discardEmptyLinks && is.undefined(link.url))
        && !(discardEmptyLinks && is.emptyStringOrWhitespace(link.url))
        && !(discardAnchorOnlyLinks && link.url?.startsWith('#'))
      ) {
        results.push({ ...link, label });
      }
    }
  }

  return results;
}
