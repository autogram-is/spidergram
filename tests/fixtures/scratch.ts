import {CheerioCrawler, Dataset, enqueueLinks} from 'crawlee';
import {getLinks} from '../../source/links.js';

(async () => {
  const results = await Dataset.open('results');
  const crawlee = new CheerioCrawler({
    async requestHandler({crawler, request, response, $, log}) {
      const result = {
        url: request.url,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
      };
      await results.pushData(result);
      const links = getLinks($).map(link => link.href);
      await enqueueLinks({
        urls: links,
        requestQueue: await crawler.getRequestQueue()
      });
      log.info(`${request.url} (${result.statusCode})`);
    }
  });
  
  // Run the crawler with initial request
  await crawlee.run(['https://karenmcgrane.com']);
})();
