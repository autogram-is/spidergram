import { CombinedSpiderContext } from '../context.js';
import is from '@sindresorhus/is';

export function requestRouter(context: CombinedSpiderContext) {
  const { request } = context;

  return new Promise<void>((resolve, reject) => {
    if (is.undefined(requestMeta)) {
      reject(new Error('Url was not requestMetaed.'));
    }
    
    else if (requestMeta.statusCode < 199 || requestMeta.statusCode > 299) {
      request.label = 'status';
      request.skipNavigation = true;
    }
    
    // This absolutely won't work
    else if (context.htmlMimeTypes) {
      request.label = 'default';
    }
    
    else if (context.downloadableMimeTypes) {
      request.label = 'download';
      request.skipNavigation = true;
    }
    resolve();
  });
}
