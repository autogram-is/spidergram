import { CheerioCrawlingContext, Request } from 'crawlee';
import { UniqueUrl, RespondsWith, Resource, LinksTo } from '../../model/index.js';
import { HtmlLink } from '../../analysis/links.js';
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