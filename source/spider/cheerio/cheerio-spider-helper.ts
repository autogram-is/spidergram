import is from '@sindresorhus/is';
import * as cheerio from 'cheerio';
import { CheerioCrawlingContext, Request } from 'crawlee';
import { UniqueUrl, RespondsWith, Resource, LinksTo } from '../../model/index.js';
import { HtmlLink } from '../index.js';
import { SpiderContext } from '../context.js';

export function buildRequest(url: UniqueUrl) {
  return new Request({
      url: url.url,
      uniqueKey: url.key,
      headers: { referer: url.referer ?? '' },
      userData: url.toJSON()
    });
}

export async function buildResponseData(
  context: CheerioCrawlingContext,
  spidergram: SpiderContext
)  {
  const { response, request } = context;
  const { currentUniqueUrl } = spidergram;

  const rs = new Resource({
    url: response.url,
    code: response.statusCode,
    message: response.statusMessage,
    headers: response.headers,
  });

  const rw = new RespondsWith({
    url: currentUniqueUrl,
    resource: rs,
    method: request.method,
    headers: request.headers ?? {}
  })

  return Promise.resolve({
    resource: rs,
    respondsWith: rw,
  });
}

export async function buildResourceLink(
  context: CheerioCrawlingContext,
  spidergram: SpiderContext,
  link: HtmlLink
) {
  const { response } = context;
  const { currentUniqueUrl, currentResource } = spidergram;

  const uu = new UniqueUrl({
    url: link.href,
    base: response.url,
    referer: response.url,
    depth: ((currentUniqueUrl?.depth) ?? 0) + 1,
  });

  if (currentResource === undefined) {
    return Promise.resolve({
      uniqueUrl: uu,
      linksTo: undefined,
    });
  } else {
    return Promise.resolve({
      uniqueUrl: uu,
      linksTo: new LinksTo({
        url: uu,
        resource: currentResource,
        ...link
      })
    });
  }
}

export const extractLinks = (
  input: cheerio.Root | string,
  selectors: Record<string, string> = { default: 'body a' },
  ignoreSelfLinkAnchors = true,
  ignoreEmptyHref = true,
): HtmlLink[] => {
  const results: HtmlLink[] = [];
  const $ = is.string(input) ? cheerio.load(input) : input;
  
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

  return results;
};
