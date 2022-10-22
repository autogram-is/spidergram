import is from '@sindresorhus/is';
import { UrlDiscoveryOptions, buildUrlDiscoveryOptions } from "./enqueue-urls.js";
import { CombinedSpiderContext } from '../context.js';

/**
 * Structured dumping ground for links found in markup; flexible enough
 * to represent both `<a>` and `<link>` tags; `context` and  `selector`
 * should be used to store information about where the link was found
 * that can't be intuited from the data/attributes/etc.
 */
 export type HtmlLink = {
  href: string;
  selector?: string;
  label?: string;
  rel?: string;
  title?: string;
  attributes?: Record<string, string>;
  data?: string | Record<string, unknown>;
};

/**
 * @param $ A crawler-appropriate reference to the string, markup, or page to be parsed for links.
 * @param context The overall Crawling context, including the current request, etc.
 * @param options Options to control link enqueueing. 
 */

export async function findUrls(
  context: CombinedSpiderContext,
  customOptions: Partial<UrlDiscoveryOptions> = {},
) {
  const options = await buildUrlDiscoveryOptions(context, customOptions);
  const { label, selector, skipAnchors, skipEmptyLinks } = options;
  const { $ } = context;
  const results: HtmlLink[] = [];

  if (!is.undefined($)) {
    $(selector).each((i, element) => {
      const { href, title, rel, ...attributes } = $(element).attr();

      if (
        !(is.emptyStringOrWhitespace(href) && skipEmptyLinks) &&
        !(href!.startsWith('#') && skipAnchors)
      ) {
        results.push({
          href: href!,
          context: label,
          selector: selector,
          rel: rel,
          title: title,
          attributes: attributes,
          data: $(element).data() ?? {},
        });
      }
    });
  }

  return Promise.resolve(results);
};
