import { RespondsWith, Resource } from '../../index.js';
import { SpiderLocalContext } from '../options.js';
import { Request } from 'crawlee';
import { IncomingMessage } from 'http';

export async function failure(context: SpiderLocalContext & { request: Request, response?: IncomingMessage }, error: Error) {
  const { storage, request, response, uniqueUrl } = context;

  const rs = new Resource({
    url: response?.url ?? request.loadedUrl ?? request.url,
    code: response?.statusCode ?? -1,
    message: `(${error.name} ${error.message})`,
    headers: response?.headers ?? {}
  });

  const rw = new RespondsWith({
    url: uniqueUrl,
    resource: rs,
    method: request.method,
    headers: request.headers ?? {}
  })

  return storage.push([rs, rw]).then(results => {});
}
