import { Request } from "crawlee";
import { UniqueUrl } from "../model/index.js";
import { SpiderLocalContext } from "./options.js";

/**
 * Structured dumping ground for links found in markup; flexible enough
 * to represent both `<a>` and `<link>` tags; `context` and  `selector`
 * should be used to store information about where the link was found
 * that can't be intuited from the data/attributes/etc.
 */
 export type HtmlLink = {
  href: string;
  selector?: string;
  context?: string;
  rel?: string;
  title?: string;
  attributes?: Record<string, string>;
  data?: string | Record<string, string>;
};

/**
 * @param $ A crawler-appropriate reference to the string, markup, or page to be parsed for links.
 * @param selectors A dictionary of named DOM selectors; the key should be used to populate the `context` property of the resulting `HtmlLink` record.
 * @param ignoreSelfLinkAnchors Discard links that only contain anchor tags.
 * @param ignoreEmptyHref Discard links that contain no href property. 
 */
  export async function extractLinks(
  $: cheerio.Root,
  selectors: Record<string, string> = { default: 'body a' },
  ignoreSelfLinkAnchors = true,
  ignoreEmptyHref = true,
) {
  const results: HtmlLink[] = [];
  
  for (const key in selectors) {
    $(selectors[key]).each((i, element) => {
      const href: string = $(element).attr('href') ?? '';

      if (
        !(href.length === 0 && ignoreEmptyHref)
        && !(href.startsWith('#') && ignoreSelfLinkAnchors)
      ) {
        results.push({
          href,
          context: key,
          rel: $(element).attr('rel') ?? '',
          title: $(element).text() ?? '',
          attributes: $(element).attr() as Record<string, string>,
          data: $(element).data() ?? {},
        });
      }
    });
  }

  return Promise.resolve(results);
};

export function uniqueUrlRequest(url: UniqueUrl, label?: string) {
  return new Request({
    url: url.url,
    uniqueKey: url.key,
    userData: { 
      label: label,
      fromUniqueUrl: true,
    },
    headers: { referer: url.referer ?? '' }
  });
}

export async function populateContextUrl(context: SpiderLocalContext & { request: Request }) {
  if ('fromUniqueUrl' in context.request.userData) {
    context.uniqueUrl = new UniqueUrl({
      url: context.request.url,
      normalizer: url => url,
      referer: context.request.headers ? context.request.headers['referer'] : ''
    })
  } else {
    context.uniqueUrl = new UniqueUrl({ url: context.request.url });
    await context.storage.push(context.uniqueUrl!, false);
  }
}