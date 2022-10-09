import { CrawlingContext, Request } from "crawlee";
import { SpiderContext } from "./context.js";
import { UniqueUrl, RespondsWith, Resource, LinksTo } from "../model/index.js";

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

type resourceBundle = {
  resource: Resource,
  respondsWith: RespondsWith,
};

type linkToBundle = {
  uniqueUrl: UniqueUrl,
  linksTo?: LinksTo
}

export abstract class SpiderHelper {
  /**
   * @param context A crawler-specific context object; be sure to to specify the correct interface in implementing functions.
   * @param spidergram Spidergram-specific context object, containing crawl rules and other state.
   */
  abstract buildResource(
    context: CrawlingContext,
    spidergram: SpiderContext
  ): Promise<resourceBundle>;

  /**
   * @param input A crawler-appropriate reference to the string, markup, or page to be parsed for links.
   * @param selectors A dictionary of named DOM selectors; the key should be used to populate the `context` property of the resulting `HtmlLink` record.
   * @param ignoreSelfLinkAnchors Discard links that only contain anchor tags.
   * @param ignoreEmptyHref Discard links that contain no href property. 
   */
   async extractLinks(
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
  /**
   * @param context A crawler-specific context object; be sure to to specify the correct interface in implementing functions.
   * @param link An object containing `href` and other link properties.
   * @param spidergram Spidergram-specific context object, containing crawl rules and other state.
   */
  abstract buildLinkTo(
    context: CrawlingContext,
    link: HtmlLink,
    spidergram: SpiderContext
  ): Promise<linkToBundle>;

  buildRequest(url: UniqueUrl) {
    const rq = new Request({
      url: url.url,
      uniqueKey: url.key,
      userData: url.toJSON()
    });
    if (url.referer) {
      rq.headers = { referer: url.referer };
    }
    return rq;
  }
}