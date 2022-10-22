import { CombinedSpiderContext } from '../context.js';

export async function prefetchRequest(context: CombinedSpiderContext) {
  return context.sendRequest({ method: 'head' })
    .then(response => {
      context.requestMeta = {
        url: response.url,
        redirectUrls: response.redirectUrls,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
      };
      response.destroy();
      return context.requestMeta;
    })
}