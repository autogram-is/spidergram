import is from '@sindresorhus/is';
import {CombinedContext} from '../context.js';
import {EnqueueUrlOptions, ensureOptions, AnchorTagData} from './index.js';

export async function find(
  context: CombinedContext,
  customOptions?: Partial<EnqueueUrlOptions>,
) {
  const options = await ensureOptions(context, customOptions);
  const {
    label,
    selector,
    skipAnchors,
    skipEmptyLinks,
  } = options;
  const {$} = context;

  return new Promise<AnchorTagData[]>(resolve => {
    const results: AnchorTagData[] = [];
    if (!is.undefined($)) {
      $(selector).each((i, element) => {
        const {href, ...attributes} = $(element).attr();
        if (
          !(skipEmptyLinks && is.undefined(href))
          && !(skipEmptyLinks && is.emptyStringOrWhitespace(href))
          && !(skipAnchors && href.startsWith('#'))
        ) {
          results.push({
            href,
            text: $(element).text(),
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
