import { Request } from "crawlee";
import { UniqueUrl, RespondsWith, Resource, LinksTo } from "../model/index.js";
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
  
export async function saveResource(
  context: SpiderLocalContext & { request: Request },
  properties: Record<string, unknown> = {}
) {
  const { storage, precheck, request } = context;

  const rs = new Resource({
    url: precheck!.url,
    code: precheck?.statusCode ?? -1,
    message: precheck!.statusMessage ?? '',
    headers: precheck!.headers ?? {},
    ...properties
  });

  const rw = new RespondsWith({
    url: context.uniqueUrl,
    resource: rs,
    redirects: precheck?.redirectUrls ?? [],
    method: request.method,
    headers: request.headers ?? {}
  })

  return storage.push([rs, rw]).then(() => rs);
}

export async function saveLink(
  link: HtmlLink,
  context: SpiderLocalContext
) {
  const { storage, uniqueUrl, resource, urlRules } = context;

  const uu = new UniqueUrl({
    url: link.href,
    base: uniqueUrl!.url,
    referer: uniqueUrl!.url,
    depth: ((uniqueUrl!.depth) ?? 0) + 1,
  });

  if ((uu.parsable && urlRules.save(uu.parsed!)) || context.saveUnparsableUrls) {
    await storage.push(uu, false);

    if (resource !== undefined) {
      const lt = new LinksTo({
        url: uu,
        resource: resource,
        ...link
      });
      await storage.push(lt)
    }
  }

  return Promise.resolve(uu);
}

export function buildRequest(url: UniqueUrl, label?: string) {
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