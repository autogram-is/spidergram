import is from '@sindresorhus/is';
import {SpiderContext} from '../context.js';
import {EnqueueUrlOptions, AnchorTagData} from './index.js';
import _ from 'lodash';

export async function find(
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

  return new Promise<AnchorTagData[]>(resolve => {
    const results: AnchorTagData[] = [];
    if (!is.undefined($)) {
      $(selector).each((i, element) => {
        const {href, ...attributes} = $(element).attr();
        if (
          !(discardEmptyLinks && is.undefined(href))
          && !(discardEmptyLinks && is.emptyStringOrWhitespace(href))
          && !(discardAnchorOnlyLinks && href.startsWith('#'))
        ) {
          results.push({
            href,
            text: $(element).text().trim(),
            label,
            selector,
            attributes,
            data: $(element).data() ?? {},
          });
        }
      });
    }

    resolve(results);
  });
}
