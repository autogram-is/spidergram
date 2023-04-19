import { HtmlTools, PropertyMap, mapProperties } from '../index.js';
import _ from 'lodash';
import { Pattern, PatternInstance, Query, Resource, aql } from '../../model/index.js';
import { getCheerio } from './get-cheerio.js';
import { Spidergram } from '../../config/index.js';
import { PropertyFilter, filterByProperty } from '../graph/filter-by-property.js';
import is from '@sindresorhus/is';

export interface FoundPattern extends HtmlTools.ElementData {
  pattern: string;
  selector: string;
}

export type ConditionalPatternGroup = Record<string, unknown> & PropertyFilter & { patterns: PatternDefinition[] };

export function isConditionalPatternGroup(input: unknown): input is ConditionalPatternGroup {
  return (is.plainObject(input) && 'patterns' in input);
}

export function isPatternDefinition(input: unknown): input is PatternDefinition {
  return (is.plainObject(input) && 'name' in input && 'selector' in input);
}

/**
 * Description of a specific markup pattern, like design element or page component.
 */
export interface PatternDefinition extends HtmlTools.ElementDataOptions {
  /**
   * A unique name for the pattern
   */
  name: string;

  description?: string;

  patternKey?: string;

  /**
   * Indicates that the definition is a named variation of a more generic pattern. 
   */
  variant?: string;

  /**
   * A CSS selector used to identify the pattern
   */
  selector: string;

  /**
   * When an instance of this pattern is found, remove its marku from the DOM 
   * so it won't be matched multiple times.
   */
  exclusive?: boolean;

  /**
   * When a pattern instance is found, attempt to extract additional information
   * via property comparisons or DOM sub-queries.
   */
  properties?: Record<string, PropertyMap | PropertyMap[]>;
}

const defaults: HtmlTools.ElementDataOptions = {
  saveTag: true,
  saveHtml: true,
  parseData: true,
  splitClasses: true,
};

export async function findAndSavePagePatterns(
  input: Resource,
  patterns: PatternDefinition | (PatternDefinition | ConditionalPatternGroup)[],
)  {
  const defs: PatternDefinition[] = [];
  if (Array.isArray(patterns)) {
    for (const pattern of patterns) {
      if (isPatternDefinition(pattern)) {
        defs.push(pattern);
      }
      else if (isConditionalPatternGroup(pattern) && filterByProperty(input, pattern)) {
        defs.push(...pattern.patterns);
      }
    }
  }

  const pts = defs.map(p => new Pattern({ key: p.patternKey, name: p.name, description: p.description }));
  const instances = findPagePatterns(input, defs);

  const sg = await Spidergram.load();
  await sg.arango.push(pts, false);
  await Query.run(aql`
    FOR pi IN pattern_instance
    FILTER pi._from == ${input.documentId}
    REMOVE { _key: pi._key } IN pattern_instance
  `);
  await sg.arango.push(instances);
}

/**
 * Identify and extract instances of markup patterns inside an HTML page.
 */
export function findPagePatterns(
  input: string | cheerio.Root | Resource,
  patterns: PatternDefinition | PatternDefinition[],
): PatternInstance[] {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  const results: PatternInstance[] = [];
  const resource = input instanceof Resource ? input : undefined;
  for (const pattern of list) {
    results.push(
      ...findPatternInstances(input, pattern).map(
        fp => new PatternInstance({
          from: resource ?? 'resources/null',
          to: `patterns/${ fp.patternKey ?? fp.pattern ?? 'null'}`,
          ...fp,
          pattern: undefined,
          patternKey: undefined,
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
): FoundPattern[] {
  const $ = getCheerio(input);
  return $(pattern.selector)
    .toArray()
    .map(element => {
      const found: FoundPattern = {
        pattern: pattern.name,
        patternKey: pattern.patternKey,
        selector: pattern.selector,
        uniqueSelector: HtmlTools.getUniqueSelector(element, $),
        ...HtmlTools.findElementData(
          $(element),
          _.defaultsDeep(pattern, defaults),
        ),
      };
      if (pattern.properties) {
        mapProperties(found, pattern.properties)
      }
      if (pattern.exclusive) {
        $(element).remove();
      }
      return found;
    });
}
