import { RequestInspectorContext } from "./inspector.js";
import is from '@sindresorhus/is';

export function defaultRequestInspector(context: RequestInspectorContext): Promise<void> {
  const { request, precheck } = context;

  return new Promise((resolve, reject) => {
    if (is.undefined(precheck)) {
      reject(new Error('Url was not prechecked.'));
    }
    
    else if (precheck.statusCode < 199 || precheck.statusCode > 299) {
      request.label = 'status';
      request.skipNavigation = true;
    }
    
    else if (precheck.headers["content-type"] === 'html') {
      request.label = 'page';
    }
    
    else if (context.downloadableMimeTypes) {
      request.label = 'download';
      request.skipNavigation = true;
    }
    resolve();
  });
}
