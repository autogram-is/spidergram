import _ from 'lodash';
import { getCheerio } from './html/index.js';

/**
 * Describes the location of a piece of data on another object.
 */
export interface PropertySource extends Record<string, unknown> {
  /**
   * The name of the property to be checked; this can be a simple property name,
   * or the dot-delimited path to a nested property.
   */
  source: string;

  /**
   * If the source property is found, and its value is a string, parse it as an HTML
   * fragment and return the first instance of this selector inside of it.
   */
  selector?: string;

  /**
   * If the source property is found, use this function to filter it or convert it to
   * another format.
   *
   * If this property is set, conditional properties (eq, lt, gt, in, contains, megate,
   * and match) **WILL NOT** be evaluated.
   */
  fn?: (value: unknown, conditions: PropertySource) => unknown | undefined;

  /**
   * If the property is not found, or the selector and fn properties are used but return
   * empty results, return this value as a fallback.
   *
   * Note: If a PropertySource with a default value is placed in the middle of an array of
   * PropertySources, its default value will be returned and all subsequent PropertySources
   * will be ignored.
   */
  default?: unknown;

  /**
   * Only return the value if it's equal to this.
   */
  eq?: unknown;

  /**
   * Only return the value if it's less than this.
   */
  lt?: string | number;

  /**
   * Only return the value if it's greater than this.
   */
  gt?: string | number;

  /**
   * Only return the value if it is contained in this. If the value is an array,
   * only return array values that are contained in this.
   */
  in?: unknown[] | string;

  /**
   * Only return the value if it is a string that matches this.
   */
  match?: string;

  /**
   * Only return the value if it contains this.
   */
  contains?: unknown;

  /**
   * Treat null values as values, rather than undefined.
   */
  nullIsValue?: true;

  /**
   * Negate any conditions.
   */
  negate?: true;
}

/**
 * Find a single value on an object using a {@link PropertySource} description. For simple
 * properties, a string can also be used instead of a full {@link PropertySource} object.
 *
 * Multiple property descriptions will be checked in order; the first one to have a defined
 * value will be returned.
 */
export function findPropertyValue<T = unknown>(
  object: T,
  locations: (string | PropertySource) | (string | PropertySource)[],
  fallback?: unknown,
): unknown | undefined {
  const sources = Array.isArray(locations) ? locations : [locations];
  for (const source of sources) {
    if (typeof source === 'string') {
      const v = _.get(object, source);
      if (!undef(v)) return v;
    } else {
      let v = _.get(object, source.source);
      if (!undef(v, source.nullIsValue)) {
        if (source.fn) {
          v = source.fn(v, source);
        } else if (
          typeof v === 'string' &&
          typeof source.selector === 'string'
        ) {
          const t = getCheerio(v)(source.selector).first().text().trim();
          if (t.length > 0) {
            v = t;
          } else {
            v = undefined;
          }
        } else {
          v = checkPropertyValue(v, source);
        }

        if (!undef(v, source.nullIsValue)) return v;
      }
    }
  }
  return fallback;
}

/**
 * This internal function applies the filtering logic for potential property values;
 * if `conditions.selector` was populated, these checks are run after the selector.
 * if `conditions.fn` is populated, thse checks **WILL NOT** be run.
 */
function checkPropertyValue(
  value: unknown,
  conditions: PropertySource,
): unknown {
  if (conditions.eq !== undefined) {
    if (_.isEqual(conditions.eq, value)) {
      return conditions.negate ? undefined : value;
    }
  } else if (conditions.gt !== undefined && value) {
    if (value > conditions.gt) {
      return conditions.negate ? undefined : value;
    }
  } else if (conditions.lt !== undefined && value) {
    if (value < conditions.lt) {
      return conditions.negate ? undefined : value;
    }
  } else if (conditions.in !== undefined && conditions.in.length > 0) {
    let foundMatch = false;
    if (Array.isArray(value)) {
      const returnValue = _.intersection(conditions.in, value);
      if (returnValue.length === 0) return undefined;
      if (returnValue.length === 1) return returnValue[0]
      return returnValue;
    } else {
      for (const condition of conditions.in) {
        if (_.isEqual(condition, value)) {
          foundMatch = true;
          if (conditions.negate) continue;
          return value;
        }
      }
    }
    if (conditions.negate && foundMatch) return undefined;
  } else if (conditions.contains !== undefined) {
    if (Array.isArray(value) && value.includes(conditions.contains)) {
      return conditions.negate ? undefined : value;
    }
  }

  return undefined;
}

function undef(value: unknown, nullIsValue = false): value is undefined {
  if (value === undefined || (value === null && !nullIsValue)) return true;
  return false;
}
