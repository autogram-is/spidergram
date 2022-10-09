import { SpiderContext } from '../context.js';
import { CheerioCrawlingContext } from 'crawlee';
import { UniqueUrl, RespondsWith, Resource } from '../../index.js';
import { SpiderHandlers } from '../spider-handlers.js';
import { CheerioSpiderHelper } from './cheerio-spider-helper.js';

/**
 * Our default request handler; it retrieves, saves, and parses responses
 * based on filter rules passed in via the spidergram parameter.
 * 
 * @param context
 * @param spidergram 
 */
export class CheerioSpiderHandlers extends SpiderHandlers {
  helpers: CheerioSpiderHelper;

  constructor() {
    super();
    this.helpers = new CheerioSpiderHelper();
  }

  async requestHandler(context: CheerioCrawlingContext, spidergram: SpiderContext): Promise<void> {
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
        const { resource, respondsWith } = await this.helpers.buildResource(context, spidergram);
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
        for (let link of await this.helpers.extractLinks($, linkSelectors)) {
          const { uniqueUrl, linksTo } = await this.helpers.buildLinkTo(context, link, spidergram);
          if (
            (uniqueUrl.parsable && urlRules.save(uniqueUrl.parsed!, spidergram))
            || spidergram.saveUnparsableUrls
          ) {
            await storage.add(uniqueUrl);
            if (linksTo) await storage.add(linksTo);
          }
          
          // if the url qualifies for continued crawling
          if (uniqueUrl.parsable) {
            if (urlRules.enqueue(uniqueUrl.parsed!, spidergram)) {
              await q.addRequest(this.helpers.buildRequest(uniqueUrl));
            }
          }
        }
      }
    }
  }

  async failureHandler(context: CheerioCrawlingContext, error: Error, spidergram: SpiderContext) {
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
}