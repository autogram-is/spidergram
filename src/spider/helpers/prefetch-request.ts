import { SpiderContext } from '../context.js';

export async function prefetchRequest(context: SpiderContext) {
  // When using 'head', be sure to turn off decompression and body retrieval,
  // or the crawler's helpful attempts to process the body will fail terribly.
  return await context
    .sendRequest({
      method: context.prefetchMethod ?? 'HEAD',
      allowGetBody: false,
      decompress: false,
    })
    .then(response => {
      context.requestMeta = {
        url: response.url,
        redirectUrls: response.redirectUrls,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        method: context.prefetchMethod ?? 'HEAD',
      };
      response.destroy();
      return context.requestMeta;
    });
}
