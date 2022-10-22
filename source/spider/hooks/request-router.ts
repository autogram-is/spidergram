import { CombinedSpiderContext } from '../context.js';

export async function requestRouter(context: CombinedSpiderContext) {
  const { request, prefetchRequest } = context;
  const requestMeta = await prefetchRequest();

  request.skipNavigation = true;

  if (requestMeta.statusCode < 199 || requestMeta.statusCode > 299) {
    request.label = 'status';
  }
  else if (context.htmlMimeTypes) {
    request.label = 'page';
    request.skipNavigation = false;
  }
  else if (context.downloadableMimeTypes) {
    request.label = 'download';
  }
  else {
    request.label = 'status';
  }
}
