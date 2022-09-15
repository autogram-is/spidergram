import is from '@sindresorhus/is';
import { CheerioParser } from './cheerio.js';
import { Dictionary, Resource } from '../index.js';
import { isHtml } from '../fetch/response-filters.js';

export function metadataFromResource(resource: Resource, customSelectors: Dictionary<string> = {}): Dictionary<string> {
  const results: Dictionary<string> = {};
  if (isHtml(resource) && is.nonEmptyStringAndNotWhitespace(resource.body)) {
    const $ = new CheerioParser(resource.body).root;
    results.title = $('title').text();
    results.description = $('meta[description]').attr('content');

    for (let k in customSelectors) {
      results[k] = $(customSelectors[k]).text();
    }  
  }
  return results;
}