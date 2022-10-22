import {CombinedContext} from '../context.js';
import {helpers} from '../index.js';

export async function requestRouter(context: CombinedContext) {
  const {request, prefetchRequest, downloadMimeTypes, parseMimeTypes} = context;
  const requestMeta = await prefetchRequest();

  const {type} = helpers.parseContentType(requestMeta);
  request.skipNavigation = true;

  if (requestMeta.statusCode < 199 || requestMeta.statusCode > 399) {
    request.label = 'status';
  } else if (parseMimeTypes.includes(type)) {
    request.label = 'page';
    request.skipNavigation = false;
  } else if (downloadMimeTypes.includes(type)) {
    request.label = 'download';
  } else {
    request.label = 'status';
  }
}
