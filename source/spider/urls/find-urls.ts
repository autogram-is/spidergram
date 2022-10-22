import is from '@sindresorhus/is';
import { UrlDiscoveryOptions, buildUrlDiscoveryOptions, HtmlLink } from "./index.js";
import { CombinedContext } from '../context.js';

/**
 * @param $ A Cheerio root instance.
 * @param context The overall Crawling context, including the current request, etc.
 * @param options Options to control link enqueueing. 
 */

export async function findUrls(
  context: CombinedContext,
  customOptions: Partial<UrlDiscoveryOptions> = {},
) {
  const options = await buildUrlDiscoveryOptions(context, customOptions);
  const { label, selector, skipAnchors, skipEmptyLinks } = options;
  const { $ } = context;

  return new Promise<HtmlLink[]>(resolve => {
    const results: HtmlLink[] = [];
    if (!is.undefined($)) {
      $(selector).each((i, element) => {
        let { href, ...attributes } = $(element).attr();
        if (
          !((is.undefined(href) || is.emptyStringOrWhitespace(href)) && skipEmptyLinks) &&
          !(href.startsWith('#') && skipAnchors)
        ) {
          results.push({
            href: href!,
            text: $(element).text(),
            label: label,
            selector: selector,
            attributes: attributes,
            data: $(element).data() ?? {},
          });
        }
      });
    }
    resolve(results);
  })
};
