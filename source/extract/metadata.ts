import is from '@sindresorhus/is';
import {
  Property,
  Properties,
  getProperty,
  setProperty,
} from '../util/index.js';

import { Resource } from '../index.js';
import { isHtml } from '../fetch/response-filters.js';
import { CheerioParser } from './cheerio.js';

export function metadataFromResource(resource: Resource): Properties {
  const results: Properties = {};
  if (isHtml(resource) && is.nonEmptyStringAndNotWhitespace(resource.body)) {
    const $ = new CheerioParser(resource.body).root;

    const meta = $('head meta');
    meta.each((index, element) => {
      const key =
        $(element).attr('name')?.trim() ?? $(element).attr('property')?.trim();
      const value = $(element).attr('content')?.trim();
      if (key) {
        if (key == 'description') {
          setProp(results, key, value);
        } else {
          appendProperty(results, key, value);
        }
      }
    });

    results.body = $('body').attr();
    const bodyClasses = $('body').attr('class');
    if (bodyClasses) {
      results.body.class = bodyClasses.replace(/s+/, ' ').split(' ');
    }

    results.title = getProperty(
      results,
      'og.title',
      $('head title').text().toString(),
    );
  }

  return results;
}

function setProp(
  object: Properties,
  key: string,
  value: Property,
  keyDelimiter = ':',
) {
  const path = key.replace(keyDelimiter, '.');
  setProperty(object, path, value);
}

function appendProperty(
  object: Properties,
  key: string,
  value: Property,
  keyDelimiter = ':',
) {
  const path = key.replace(keyDelimiter, '.');
  const currentProp = getProperty(object, path);

  if (is.undefined(currentProp)) {
    setProperty(object, path, value);
  } else if (is.array(currentProp)) {
    if (is.array(value)) {
      setProperty(object, path, [...currentProp, ...value]);
    } else {
      setProperty(object, path, [...currentProp, value]);
    }
  } else {
    setProperty(object, path, [currentProp, value]);
  }
}
