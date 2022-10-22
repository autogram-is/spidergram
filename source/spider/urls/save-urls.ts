import { CombinedContext } from '../context.js';
import { UniqueUrl, LinksTo } from "../../model/index.js";
import { HtmlLink, UrlDiscoveryOptions, buildUrlDiscoveryOptions } from "./index.js";

export async function saveUrl(
  link: HtmlLink,
  context: CombinedContext,
  customOptions: Partial<UrlDiscoveryOptions> = {},
) {
  const { storage, uniqueUrl, resource } = context;
  const options = await buildUrlDiscoveryOptions(context, customOptions);

  const uu = new UniqueUrl({
    url: link.href,
    base: uniqueUrl?.url,
    referer: uniqueUrl?.url,
    depth: (uniqueUrl !== undefined) ? uniqueUrl.depth + 1 : 0,
  });

  // If it's parsable and the parsed URL passes the global
  // 'save this URL' filter, OR `skipUnparsableLinks` is set in
  // the options, we plow on forward. Otherwise, we'll return
  // the UniqueUrl unpersisted.
  if (uu.parsable || !options.skipUnparsableLinks) {
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

export async function saveUrls(
  links: HtmlLink[],
  context: CombinedContext,
  customOptions: Partial<UrlDiscoveryOptions> = {},
) {
  return Promise.all(links.map(link => saveUrl(link, context, customOptions))) 
}

export async function saveCurrentUrl(context: CombinedContext) {
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