import {CombinedContext} from '../context.js';

export async function prefetchRequest(context: CombinedContext) {
  // When using 'head', be sure to turn off decompression and body retrieval,
  // or the crawler's helpful attempts to process the body will fail terribly.
  return context.sendRequest({method: 'HEAD', allowGetBody: false, decompress: false})
    .then(response => {
      context.requestMeta = {
        url: response.url,
        redirectUrls: response.redirectUrls,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        method: 'HEAD'
      };
      response.destroy();
      return context.requestMeta;
    });
}
