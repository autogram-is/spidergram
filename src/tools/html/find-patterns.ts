import { parseWithCheerio } from './parse-with-cheerio.js';
import arrify from 'arrify';

/**
 * Description of a specific markup pattern, like design element or page component.
 */
export interface PatternDefinition {
  /**
   * A unique name for the pattern
   */
  name: string;

  /**
   * A CSS selector used to identify the pattern
   */
  selector: string;

  /**
   * A function to extract additional data from each pattern instance.
   * This can be usd to capture data inside the pattern markup, like
   * a Card's headline and summary text, a CTA Button's link text and
   * icon, or the number of items in a Rotator.
   */
  extractor?: (
    element: cheerio.Element,
    $: cheerio.Root,
  ) => Record<string, unknown>;
}

export interface FoundPattern {
  [keyof: string]: unknown;
  pattern: string;
  tagName: string;
  attributes?: Record<string, string>;
  data?: Record<string, unknown>;
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
  const $ = typeof html === 'string' ? parseWithCheerio(html) : html;

  for (const pattern of arrify(patterns)) {
    const search = $(pattern.selector)
      .toArray()
      .map(el => {
        return {
          pattern: pattern.name,
          tagName: $(el).get(0).tagName,
          attributes: $(el).attr() ?? undefined,
          data: $(el).data() ?? undefined,
          ...(pattern.extractor ? pattern.extractor(el, $) : {}),
        };
      });
    results.push(...search);
  }
  return results;
}
