import {CombinedContext} from '../context.js';

export async function prefetchRequest(context: CombinedContext) {
  return context.sendRequest({method: 'head', allowGetBody: false})
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
    });
}
