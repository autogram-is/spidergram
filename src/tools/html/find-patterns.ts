import { HtmlTools } from '../index.js';
import arrify from 'arrify';
import _ from 'lodash';

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
}

export interface FoundPattern extends HtmlTools.ElementData {
  pattern: string;
  selector: string;
}

const defaults: HtmlTools.ElementDataOptions = {
  includeTagName: true,
  contentIsAttribute: true,
  dataIsDictionary: true,
  classIsArray: true
}

/**
 * Identify and extract instances of markup patterns inside an HTML page.
 *
 * @param html - Raw HTML markup, or a Cheerio object
 * @param patterns - One or more pattern definitions
 */
export function findPatterns(
  html: string | cheerio.Root,
  patterns: PatternDefinition | PatternDefinition[],
): FoundPattern[] {
  const results: FoundPattern[] = [];
  const $ = typeof html === 'string' ? HtmlTools.getCheerio(html) : html;

  for (const pattern of arrify(patterns)) {
    const search: FoundPattern[] = $(pattern.selector).toArray().map(element => {
        return {
          pattern: pattern.name,
          selector: pattern.selector,
          ...HtmlTools.findElementData($(element), _.defaultsDeep(pattern, defaults))
        }
    });
    results.push(...search);
  }
  return results;
}
