import { SpiderContext } from '../context.js';
import { CheerioCrawlingContext, Request } from 'crawlee';
import { UniqueUrl, RespondsWith, Resource, LinksTo } from '../../index.js';
import { extractLinks } from './cheerio-spider-helper.js';
import { HtmlLink } from '../index.js';

/**
 * Our default request handler; it retrieves, saves, and parses responses
 * based on filter rules passed in via the spidergram parameter.
 * 
 * @param context
 * @param spidergram 
 */
 export async function cheerioSpiderRequestHandler(context: CheerioCrawlingContext, spidergram: SpiderContext): Promise<void> {
  const {crawler, request, response, $, log} = context;
  const {storage, responseRules, urlRules, linkSelectors} = spidergram;

  // Retrieve the UniqueUrl associated with the Request; if one doesn't exist
  // or the one that's there is malformed, create a new one and persist it.
  try {
    spidergram.currentUniqueUrl = UniqueUrl.fromJSON(request.userData);
  } catch {
    const uu = new UniqueUrl({ url: request.url });
    await storage.add(uu);
    request.userData = uu.toJSON();
    spidergram.currentUniqueUrl = uu;
  }

  // If the crawl-wide 'abort' rule is true clean up and don't
  // bother saving anything else. 
  if (responseRules.abort(response, spidergram)) {
    spidergram.currentResource = undefined;
    spidergram.currentUniqueUrl = undefined;
    log.info(`${request.url} aborted`);
  } else {
    
    // If the crawl rules say this response should be saved, create a Resource
    // and a RespondsWith from it, optionally saving the body, and persist them.
    if (responseRules.save(response, spidergram)) {
      const { resource, respondsWith } = await buildResponseData(context, spidergram);
      if (responseRules.saveBody(response, spidergram)) {
        resource.body = $.html();
      }
      await storage.add([resource, respondsWith]);
      spidergram.currentResource = resource;
    }
  
    // If the crawl rules say to parse the current response for links,
    // feed the cheerio instance and selector list to the extractLinks
    // helper function, then iterate over the results.
    if (responseRules.parseLinks(response, spidergram)) {
      const q = await crawler.getRequestQueue();
      for (let link of extractLinks($, linkSelectors)) {
        const { uniqueUrl, linksTo } = await buildResourceLink(context, spidergram, link);
        if (urlRules.save(uniqueUrl, spidergram)) {
          await storage.add(uniqueUrl);
          if (linksTo) await storage.add(linksTo);
        }
    
        // if the url qualifies for continued crawling
        if (urlRules.enqueue(uniqueUrl, spidergram)) {
          await q.addRequest(buildRequest(uniqueUrl));
        }
      }
    }
  }
}


export async function cheerioSpiderFailureHandler(context: CheerioCrawlingContext, error: Error, spidergram: SpiderContext) {
  const { storage } = spidergram;
  const { request, response } = context;
  const ru = UniqueUrl.fromJSON(request.userData);

  const rs = new Resource({
    url: response.url ?? request.loadedUrl ?? request.url,
    code: response.statusCode ?? -1,
    message: `${response.statusMessage} (${error.name} ${error.message})`,
    headers: response.headers ?? {}
  });

  const rw = new RespondsWith({
    url: ru,
    resource: rs,
    method: request.method,
    headers: request.headers ?? {}
  })

  await storage.add([ru, rw]);
}

export function buildRequest(url: UniqueUrl) {
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