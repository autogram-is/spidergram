import is from "@sindresorhus/is";
import { PropertyFilter } from "./filter-by-property.js";
import { HtmlTools, PropertyMap } from "../index.js";
import { Entity, Reference, Resource, Pattern, Query } from "../../model/index.js";
import { Spidergram } from "../../config/index.js";

export type ConditionalPatternGroup = PropertyFilter & {
  patterns?: PatternDefinition[];
  pattern?: PatternDefinition;
};

export function isConditionalPatternGroup(
  input: unknown,
): input is ConditionalPatternGroup {
  return is.plainObject(input) && ('patterns' in input || 'pattern' in input);
}

export function isPatternDefinition(
  input: unknown,
): input is PatternDefinition {
  return is.plainObject(input) && 'name' in input && 'selector' in input;
}

/**
 * Description of a specific markup pattern, like design element or page component.
 */
export interface PatternDefinition extends HtmlTools.ElementDataOptions {
  /**
   * A unique identifier for the pattern. If multiple pattern definitions
   * use the same key, only one Pattern record will be created but all
   * of the definitions will be used when locating patterns.
   * 
   * This can be useful when creating conditional pattern groups, where
   * different selector and extraction rules are used to detect and
   * populate the pattern instance depending on the site. 
   */
  id: string;

  /**
   * A human-friendly label for the pattern
   */
  name?: string;

  /**
   * A description of the pattern's purpose or other notes about its usage
   */
  description?: string;

  /**
   * The id of a parent or generic pattern type this pattern is a variant of.
   */
  parent?: string;

  /**
   * A CSS selector used to identify the pattern.
   * 
   * If no selector is given, the pattern will be saved and tracked in the
   * database but no instances of it will be found.
   */
  selector?: string;

  /**
   * When an instance of this pattern is found, remove its markup from the DOM
   * so it won't be matched multiple times.
   */
  exclusive?: boolean;

  /**
   * When a pattern instance is found, attempt to extract additional information
   * via property comparisons or DOM sub-queries.
   */
  properties?: Record<string, PropertyMap | PropertyMap[]>;
}

/**
 * This takes the configuration information
 */
export async function buildPatterns(
  patterns: (PatternDefinition | ConditionalPatternGroup)[] = [],
) {
  const sg = await Spidergram.load();
  const configPatterns = sg.config.analysis?.patterns;
  if (configPatterns) {
    patterns.push(...configPatterns as (PatternDefinition | ConditionalPatternGroup)[]);
  }

  const defs: Record<string, PatternDefinition> = {};

  if (Array.isArray(patterns)) {
    for (const pattern of patterns) {
      if (isPatternDefinition(pattern)) {
        if (defs[pattern.id] === undefined) defs[pattern.id] = pattern;
      } else if (isConditionalPatternGroup(pattern)) {
        if (pattern.pattern){
          if (defs[pattern.pattern.id] === undefined) defs[pattern.pattern.id] = pattern.pattern;
        }
        if (pattern.patterns) {
          for (const p of pattern.patterns) {
            if (defs[p.id] === undefined) defs[p.id] = p;
          }
        }
      }
    }
  }

  const pts = Object.values(defs).map(
    p =>
      new Pattern({
        key: ensurePatternId(p.id),
        name: p.name,
        description: p.description,
        parent: p.parent,
      }),
  );

  return sg.arango.push(pts);
}

function ensurePatternId(input?: string) {
  if (input) {
    const parts = input.split('/');
    if (parts.length === 1) return `patterns/${parts[0]}`;
    if (parts.length === 2) return `patterns/${parts[1]}`;
  }
  return undefined;
}

/**
 * Remove saved Pattern Appearances, optionally filtering by resource and/or pattern.
 */
export async function clearPatternAppearances(
  resource?: Reference<Resource>,
  pattern?: Reference<Pattern>
) {
  const q = new Query('appears_on');
  if (resource) q.filterBy('_to', Entity.idFromReference(resource));
  if (pattern) q.filterBy('_from', Entity.idFromReference(pattern))
  return q.remove().run();
}

