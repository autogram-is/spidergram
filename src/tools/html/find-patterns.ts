import { HtmlTools, UrlTools } from '../index.js';
import _ from 'lodash';
import { Fragment, Reference, Resource } from '../../model/index.js';
import { getCheerio } from './get-cheerio.js';
import { ParsedUrl } from '@autogram/url-tools';

export interface FoundPattern extends HtmlTools.ElementData {
  pattern: string;
  selector: string;
  location?: Reference<Resource>;
}

/**
 * Description of a specific markup pattern, like design element or page component.
 */
export interface PatternDefinition extends HtmlTools.ElementDataOptions {
  /**
   * A unique name for the pattern
   */
  name: string;

  /**
   * A CSS selector used to identify the pattern
   */
  selector: string;

  /**
   * An optional post-processing function that can be used to extract additional information
   * or alter the pattern before it's returned.
   */
  fn?: (
    instance: FoundPattern,
    element: cheerio.Element,
    root: cheerio.Root,
  ) => FoundPattern;

  /**
   * One or more URL filters this pattern should apply to. Only applicable when
   * the input is a {@link Resource} object.
   */
  urlFilter?: UrlTools.UrlFilterInput;
}

const defaults: HtmlTools.ElementDataOptions = {
  includeTagName: true,
  contentIsAttribute: true,
  dataIsDictionary: true,
  classIsArray: true,
};

/**
 * Identify and extract instances of markup patterns inside an HTML page.
 *
 * @param html - Raw HTML markup, or a Cheerio object
 * @param patterns - One or more pattern definitions
 */
export function findPagePatterns(
  input: string | cheerio.Root | Resource,
  patterns: PatternDefinition | PatternDefinition[],
  options: Record<string, unknown> = {},
): Fragment[] {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  const results: Fragment[] = [];
  for (const pattern of list) {
    results.push(
      ...findPatternInstances(input, pattern, options).map(
        fp => new Fragment(fp),
      ),
    );
  }

  return results;
}

/**
 * Identify and extract instances of markup patterns inside an HTML page.
 *
 * @param html - Raw HTML markup, or a Cheerio object
 * @param patterns - One or more pattern definitions
 */
export function findPatternInstances(
  input: string | cheerio.Root | Resource,
  pattern: PatternDefinition,
  options: Record<string, unknown> = {},
): FoundPattern[] {
  if (pattern.urlFilter && !(input instanceof Resource)) {
    return [];
  }

  let url: ParsedUrl | undefined;
  if (input instanceof Resource) url = input.parsed;
  url ??= options.url ? new ParsedUrl(options.url.toString()) : undefined;
  if (pattern.urlFilter) {
    if (!url) return [];
    if (!UrlTools.filterUrl(url, pattern.urlFilter)) return [];
  }

  const $ = getCheerio(input);
  return $(pattern.selector)
    .toArray()
    .map(element => {
      let found: FoundPattern = {
        pattern: pattern.name,
        selector: pattern.selector,
        uniqueSelector: HtmlTools.getUniqueSelector(element, $),
        location: input instanceof Resource ? input.documentId : undefined,
        ...HtmlTools.findElementData(
          $(element),
          _.defaultsDeep(pattern, defaults),
        ),
      };
      if (pattern.fn) {
        found = pattern.fn(found, element, $);
      }
      return found;
    });
}
