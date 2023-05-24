import { HtmlTools, mapProperties } from '../index.js';
import _ from 'lodash';
import { AppearsOn, Resource } from '../../model/index.js';
import { getCheerio } from './get-cheerio.js';
import { PatternDefinition } from '../graph/build-patterns.js';

export interface FoundPattern extends HtmlTools.ElementData {
  pattern: string;
  selector?: string;
}

const defaults: HtmlTools.ElementDataOptions = {
  saveTag: true,
  saveHtml: true,
  parseData: true,
  splitClasses: true,
};

/**
 * Identify and extract instances of markup patterns inside an HTML page.
 */
export function findPagePatterns(
  input: string | cheerio.Root | Resource,
  patterns: PatternDefinition | PatternDefinition[],
): AppearsOn[] {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  const results: AppearsOn[] = [];
  const resource = input instanceof Resource ? input : undefined;
  for (const pattern of list) {
    results.push(
      ...findPatternInstances(input, pattern).map(fp => {
        const pi = new AppearsOn({
          ...fp,
          pattern: `patterns/${fp.patternId ?? fp.pattern ?? 'null'}`,
          page: resource ?? 'resources/null',
          patternId: undefined,
        });
        return pi;
      }),
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
): FoundPattern[] {
  if (pattern.selector && pattern.selector.length > 0) {
    const $ = getCheerio(input);
    return $(pattern.selector)
      .toArray()
      .map(element => {
        const found: FoundPattern = {
          pattern: pattern.name ?? pattern.id,
          patternId: pattern.id,
          selector: pattern.selector,
          uniqueSelector: HtmlTools.getUniqueSelector(element, $),
          ...HtmlTools.findElementData(
            $(element),
            _.defaultsDeep(pattern, defaults),
          ),
        };
        if (pattern.properties) {
          mapProperties(found, pattern.properties);
        }
        if (pattern.exclusive) {
          $(element).remove();
        }
        return found;
      });
  } else {
    return [];
  }
}
