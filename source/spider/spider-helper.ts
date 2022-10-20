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
  const { storage, precheck, request, uniqueUrl } = context;
  let results: (Resource | RespondsWith)[] = [];

  // We pull from the precheck, since we perform that step
  // before every single request, even if the full load is
  // eventually cancelled. The four properites from it can
  // be overridden by passing in custom values in the
  // `properties` object.
  results.push(new Resource({
    url: precheck!.url,
    code: precheck?.statusCode ?? -1,
    message: precheck!.statusMessage ?? '',
    headers: precheck!.headers ?? {},
    ...properties
  }));

  // If a uniqueUrl exists in the global context, link the
  // Resource to it. May add an override later to skip this
  // step no matter what.
  if (uniqueUrl !== undefined) {
    results.push(new RespondsWith({
      url: context.uniqueUrl,
      resource: results[0] as Resource,
      redirects: precheck?.redirectUrls ?? [],
      method: request.method,
      headers: request.headers ?? {}
    }));
  }

  // There's probably a better tuple-y way to do this; for
  // now, it works.
  return storage.push(results).then(() => results[0] as Resource);
}

export async function saveLink(
  link: HtmlLink,
  context: SpiderLocalContext
) {
  const { storage, uniqueUrl, resource, urlRules } = context;

  const uu = new UniqueUrl({
    url: link.href,
    base: uniqueUrl?.url,
    referer: uniqueUrl?.url,
    depth: (uniqueUrl !== undefined) ? uniqueUrl.depth + 1 : 0,
  });

  // If it's parsable and the parsed URL passes the global
  // 'save this URL' filter, OR `saveUnparsableUrls` is set in
  // the options, we plow on forward. Otherwise, we'll return
  // the UniqueUrl unpersisted.
  if ((uu.parsable && urlRules.save(uu.parsed!)) || context.saveUnparsableUrls) {
    await storage.push(uu, false);

    // If there's no active Resource, we don't bother creating
    // the LinksTo. As with `saveResource` we'll probably want
    // to provide some way to override the behavior even when
    // the Resource is present.
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