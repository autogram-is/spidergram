import {Request} from 'crawlee';
import {RespondsWith, Resource} from '../../index.js';
import {SpiderContext} from '../context.js';

export async function failure(context: SpiderContext & {request: Request}, error: Error) {
  const {storage, request, uniqueUrl} = context;

  const rs = new Resource({
    url: request.loadedUrl ?? request.url,
    code: -1,
    message: `(${error.name} ${error.message})`,
    headers: {},
  });

  const rw = new RespondsWith({
    url: uniqueUrl,
    resource: rs,
    method: request.method,
    headers: request.headers ?? {},
  });

  return storage.push([rs, rw]).then(results => {});
}
