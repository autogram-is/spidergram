import is from '@sindresorhus/is';
import { SpiderContext } from '../context.js';
import { EnqueueUrlOptions } from './index.js';
import { HtmlTools } from '../../index.js';
import _ from 'lodash';
import { getCheerio } from '../../tools/html/get-cheerio.js';
import { FoundLink } from '../../tools/html/find-links.js';
import { chopBySelector } from '../../tools/html/chop-by-selector.js';

export function findUrls(
  context: SpiderContext,
  customOptions?: Partial<EnqueueUrlOptions>,
) {
  const options: EnqueueUrlOptions = _.defaultsDeep(
    customOptions,
    context.urlOptions,
  );
  const { selectors, discardlocalAnchors, discardEmpty } =
    options;

  // We're doing this song and dance temporarily, to avoid altering the underlying
  // DOM before it's saved.
  const { resource } = context;
  const html = resource?.body ?? '';
  const $ = getCheerio(html);

  const results: HtmlTools.FoundLink[] = [];
  if (typeof selectors === 'string') {
    for (const link of HtmlTools.findLinks($, selectors)) {
      if (!discardLink(link, discardlocalAnchors, discardEmpty)) {
        results.push(link);
      }
    }
  } else {
    const regions = chopBySelector(html, selectors);
    for (const [label, regionHtml] of Object.entries(regions)) {
      const selector = selectors[label];
      if (selector === undefined) {
        for (const link of HtmlTools.findLinks(regionHtml)) {
          if (!discardLink(link, discardlocalAnchors, discardEmpty)) {
            link.label = label;
            results.push(link);
          }
        }
      } else if (typeof selector === 'string') {
        for (const link of HtmlTools.findLinks(regionHtml, selector)) {
          if (!discardLink(link, discardlocalAnchors, discardEmpty)) {
            link.label = label;
            results.push(link);
          }
        }
      } else {
        const { linkSelector, ...additionalProperties } = selector;
        for (const link of HtmlTools.findLinks(regionHtml, linkSelector)) {
          if (!discardLink(link, discardlocalAnchors, discardEmpty)) {
            results.push({ ...link, ...additionalProperties, label });
          }
        }
      }
    }
  }

  return results;
}

function discardLink(link: FoundLink, discardLocalAnchors: boolean, discardEmpty: boolean): boolean {
  if (discardEmpty && is.undefined(link.url)) return true;
  if (discardEmpty && is.emptyStringOrWhitespace(link.url)) return true;
  if (discardLocalAnchors && link.url?.startsWith('#')) return true;
  return false;
}