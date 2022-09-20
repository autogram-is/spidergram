import is from '@sindresorhus/is';
import {
  Dictionary,
  Property,
  Properties,
  getProperty,
  setProperty,
} from '../util/index.js';

import { Resource } from '../index.js';
import { isHtml } from '../fetch/response-filters.js';
import { CheerioParser } from './cheerio.js';

export function statsFromMarkup(
  resource: Resource,
  selectors: Dictionary<string> = {},
): Properties {
  selectors = {
    structure: 'header, nav, main, article, aside, footer, section',
    styles: 'style',
    scripts: 'script',
    forms: 'form',
    media: 'video, audio',
    embed: 'embed, iframe, object, portal',
    ...selectors,
  };
  const results: Properties = {};
  if (isHtml(resource) && is.nonEmptyStringAndNotWhitespace(resource.body)) {
    const $ = new CheerioParser(resource.body).root;

    for (const s in selectors) {
      results[s] = $(selectors[s]).length;
    }
  }

  return results;
}
