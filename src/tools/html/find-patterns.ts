import { HtmlTools, UrlTools } from '../index.js';
import _ from 'lodash';
import { Pattern, PatternInstance, Query, Resource, aql } from '../../model/index.js';
import { getCheerio } from './get-cheerio.js';
import { ParsedUrl } from '@autogram/url-tools';
import { Spidergram } from '../../config/index.js';

export interface FoundPattern extends HtmlTools.ElementData {
  pattern: string;
  selector: string;
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

  description?: string;

  key?: string;

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

export async function findAndSavePagePatterns(
  input: Resource,
  patterns: PatternDefinition | PatternDefinition[],
  options: Record<string, unknown> = {},
)  {
  const pts = (Array.isArray(patterns) ? patterns : [patterns]).map(
    p => new Pattern({ key: p.key, name: p.name, description: p.description })
  );
  const instances = findPagePatterns(input, patterns, options);

  const sg = await Spidergram.load();
  await sg.arango.push(pts, false);
  await Query.run(aql`
    FOR pi IN pattern_instance
    FILTER pi._from == ${input.documentId}
    REMOVE { _key: pi._key } IN pattern_instance
  `);
  await sg.arango.push(instances, true);
}

/**
 * Identify and extract instances of markup patterns inside an HTML page.
 */
export function findPagePatterns(
  input: string | cheerio.Root | Resource,
  patterns: PatternDefinition | PatternDefinition[],
  options: Record<string, unknown> = {},
): PatternInstance[] {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  const results: PatternInstance[] = [];
  const resource = input instanceof Resource ? input : undefined;
  for (const pattern of list) {
    results.push(
      ...findPatternInstances(input, pattern, options).map(
        fp => new PatternInstance({
          from: resource ?? 'resources/null',
          to: `patterns/${ fp.key ?? fp.pattern ?? 'null'}`,
          ...fp,
          pattern: undefined,
          key: undefined,
        }),
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
        key: pattern.key,
        selector: pattern.selector,
        uniqueSelector: HtmlTools.getUniqueSelector(element, $),
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
