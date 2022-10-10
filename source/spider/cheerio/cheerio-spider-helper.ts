import { CheerioCrawlingContext } from 'crawlee';
import { UniqueUrl, RespondsWith, Resource, LinksTo } from '../../model/index.js';
import { HtmlLink, SpiderHelper } from '../spider-helper.js';
import { SpiderContext } from '../context.js';

export class CheerioSpiderHelper extends SpiderHelper {
  async buildResource(
    context: CheerioCrawlingContext,
    spidergram: SpiderContext
  ) {
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
  
  async buildLinkTo(
    context: CheerioCrawlingContext,
    link: HtmlLink,
    spidergram: SpiderContext
  ) {
    const { response } = context;
    const { currentUniqueUrl, currentResource } = spidergram;
  
    if (
      (currentResource === undefined) ||
      (currentUniqueUrl === undefined)
    ) return Promise.reject();

    const uu = new UniqueUrl({
      url: link.href,
      base: response.url,
      referer: response.url,
      depth: ((currentUniqueUrl?.depth) ?? 0) + 1,
    });

    const lt = new LinksTo({
      url: uu,
      resource: currentResource,
      ...link
    });

    return Promise.resolve({
      uniqueUrl: uu,
      linksTo: lt
    });
  }
}