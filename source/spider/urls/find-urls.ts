import is from '@sindresorhus/is';
import {CombinedContext} from '../context.js';
import {EnqueueUrlOptions, buildEnqueueUrlOptions, HtmlLink} from './index.js';

export async function findUrls(
  context: CombinedContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await buildEnqueueUrlOptions(context, customOptions);
  const {label, selector, skipAnchors, skipEmptyLinks} = options;
  const {$} = context;

  return new Promise<HtmlLink[]>(resolve => {
    const results: HtmlLink[] = [];
    if (!is.undefined($)) {
      $(selector).each((i, element) => {
        const {href, ...attributes} = $(element).attr();
        if (
          !((is.undefined(href) || is.emptyStringOrWhitespace(href)) && skipEmptyLinks)
          && !(href.startsWith('#') && skipAnchors)
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
