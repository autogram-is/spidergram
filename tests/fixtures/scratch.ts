import {CheerioCrawler, enqueueLinks} from 'crawlee';
import {getLinks} from '../../source/extractors/links.js';

(async () => {
  const crawlee = new CheerioCrawler({
    async requestHandler({crawler, request, response, $, log}) {
      const links = getLinks($).map(link => link.href);
      await enqueueLinks({
        urls: links,
        requestQueue: await crawler.getRequestQueue()
      });
      log.info(`${request.url} (${response.statusCode})`);
    }
  });
  
  // Run the crawler with initial request
  await crawlee.run(['https://karenmcgrane.com']);
})();
