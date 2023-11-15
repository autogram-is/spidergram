import _ from 'lodash';
import minimatch from 'minimatch';
import { getCheerio } from './html/index.js';
import is from '@sindresorhus/is';

/**
 * A mapping rule used to extract a single value from a source object.
 *
 * - a string with the name of a source property, or the dot-notation path of a
 *   nested source property
 * - a {@link PropertyMapRule} object with a property name or path, and optional
 *   transformation rules
 * - a function that accepts the object and returns a property value or `undefined`
 */
export type PropertyMap<T = unknown> =
  | string
  | PropertyMapRule
  | ((input: T) => unknown);

/**
 * Describes the location of a piece of data on a source object.
 */
export interface PropertyMapRule extends Record<string, unknown> {
  /**
   * The name of the property to be checked; this can be a simple property name,
   * or the dot-delimited path to a nested property.
   */
  source: string;

  /**
   * If the source property is found, and its value is a string, parse it as an HTML
   * fragment and return the inner text.
   */
  selector?: string;

  /**
   * If a selector is used, return the number of matches rather than the content.
   */
  count?: boolean;

  /**
   * If a selector is used, return the value of an attribute rather than the element text.
   */
  attribute?: string;

  /**
   * If the property value is found and is an array, limit the number of results
   * to this number.
   *
   * @defaultValue: undefined
   */
  limit?: number;

  /**
   * If the property value is found and is an array, collapse it to a string
   * using the specified delimiter. If `join` is undefined or false, array
   * will remain arrays.
   *
   * @defaultValue: undefined
   */
  join?: string;

  /**
   * If the property value is found and is a string, split it into an array using this
   * character or regular expression.
   *
   * @defaultValue: undefined
   */
  split?: string | RegExp;

  /**
   * If the property is not found, or the selector returns empty results, return this value
   * as a fallback.
   *
   * Note: If a PropertyMap with a default value is placed in the middle of an array of
   * PropertyMaps, its default value will be returned and all subsequent PropertyMap
   * will be ignored.
   */
  fallback?: unknown;

  /**
   * If set, this value will be returned in place of the found value.
   *
   * This can be useful when you're *looking for* a messy value in one property
   * and want to set a clean flag or value in another property depending on the
   * ugly one.
   *
   * If the `value` property contains a function, that function will be called to
   * generate the return value.
   */
  value?:
    | string
    | number
    | boolean
    | ((value: unknown, conditions: PropertyMapRule) => unknown | undefined);

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
   * Only return the value if it is a string that matches this. If it is an array,
   * only return values of the array that match this.
   */
  matching?: string;

  /**
   * Only return the value if it contains this.
   */
  contains?: unknown;

  /**
   * Treat null values as values, rather than undefined.
   */
  acceptNull?: true;

  /**
   * Treat empty strings and arrays as values, rather than undefined.
   */
  acceptEmpty?: true;

  /**
   * Negate any conditions.
   */
  negate?: true;
}

export function mapProperties<T extends object>(
  obj: T,
  map: Record<string, PropertyMap | PropertyMap[]>,
): T {
  const domDictionary: Record<string, cheerio.Root> = {};

  for (const [prop, rule] of Object.entries(map)) {
    _.set(obj, prop, findPropertyValue(obj, rule, domDictionary));
  }

  return obj;
}

/**
 * Find a single value on an object using one or more {@link PropertyMap<Resource>}
 * descriptions.
 *
 * If an array is given, the individual {@link PropertyMap<Resource>} records will be
 * checked in order; the first one to produce a value will be used. If none
 * produce a value, the `fallback` parameter will be returned.
 */
export function findPropertyValue<T = object>(
  object: T,
  locations: PropertyMap<T> | PropertyMap<T>[],
  domDictionary: Record<string, cheerio.Root> = {},
): unknown | undefined {
  const sources = Array.isArray(locations) ? locations : [locations];
  for (const source of sources) {
    if (typeof source === 'string') {
      const v = _.get(object, source);
      if (!undef(v)) return v;
    } else if (is.function_(source)) {
      const v = source(object);
      if (!undef(v)) return v;
    } else {
      let v = _.get(object, source.source);
      if (!undef(v, source)) {
        if (typeof v == 'string' && source.split) {
          const matches = v.split(source.split);
          if (source.count) {
            v = matches.length;
          } else {
            if (matches.length > 0) {
              v = matches.slice(0, source.limit);
              v = source.join || v.length === 1 ? v.join(source.join) : v;
              if (v?.length === 0) v = undefined;
            } else {
              v = undefined;
            }
          }
        } else if (
          typeof v === 'string' &&
          typeof source.selector === 'string'
        ) {
          const $ = domDictionary[source.source] ?? getCheerio(v);
          domDictionary[source.source] ??= $;

          const matches = $(source.selector).toArray();
          if (source.count) {
            v = matches.length;
          } else {
            if (matches.length > 0) {
              v = matches.slice(0, source.limit).map(e => {
                if (source.attribute)
                  return $(e).attr(source.attribute)?.trim();
                else return $(e).text().trim();
              });
              v = source.join || v.length === 1 ? v.join(source.join) : v;
              if (v?.length === 0) v = undefined;
            } else {
              v = undefined;
            }
          }
        } else {
          v = checkPropertyValue(v, source);
        }

        if (!undef(v, source)) {
          return v;
        }
      }
    }
  }

  return undefined;
}

/**
 * This internal function applies the filtering logic for potential property values;
 * if `conditions.selector` was populated.
 */
function checkPropertyValue(value: unknown, rule: PropertyMapRule): unknown {
  if (rule.eq !== undefined) {
    if (_.isEqual(rule.eq, value)) {
      return rule.negate ? undefined : getReturnValue(value, rule);
    }
  } else if (rule.gt !== undefined && value) {
    if (value > rule.gt) {
      return rule.negate ? undefined : getReturnValue(value, rule);
    }
  } else if (rule.lt !== undefined && value) {
    if (value < rule.lt) {
      return rule.negate ? undefined : getReturnValue(value, rule);
    }
  } else if (rule.in !== undefined && rule.in.length > 0) {
    let foundMatch = false;
    if (Array.isArray(value)) {
      const returnValue = _.intersection(rule.in, value);
      if (returnValue.length === 0) return getReturnValue(undefined, rule);
      if (returnValue.length === 1) return getReturnValue(returnValue[0], rule);
      return getReturnValue(returnValue, rule);
    } else {
      for (const condition of rule.in) {
        if (_.isEqual(condition, value)) {
          foundMatch = true;
          if (rule.negate) continue;
          return getReturnValue(value, rule);
        }
      }
    }
    if (rule.negate && foundMatch) return undefined;
  } else if (rule.contains !== undefined) {
    if (Array.isArray(value) && value.includes(rule.contains)) {
      return rule.negate ? undefined : getReturnValue(value, rule);
    }
  } else if (rule.matching !== undefined) {
    if (typeof value === 'string') {
      if (minimatch(value, rule.matching)) {
        return rule.negate ? undefined : getReturnValue(value, rule);
      }
    } else if (Array.isArray(value)) {
      const returnList = value
        .map(v => v.toString().trim())
        .filter(
          v =>
            typeof v === 'string' &&
            rule.matching &&
            minimatch(v, rule.matching),
        );
      if (rule.join || returnList.length === 1) {
        return getReturnValue(
          returnList.slice(rule.limit).join(rule.join),
          rule,
        );
      } else {
        return getReturnValue(returnList.slice(rule.limit), rule);
      }
    }
  }

  return undefined;
}

function undef(value: unknown, rule?: PropertyMapRule): value is undefined {
  const nok = rule?.acceptNull ?? false;
  const eok = rule?.acceptEmpty ?? false;

  if (
    value === undefined ||
    (is.null_(value) && !nok) ||
    (is.emptyArray(value) && !eok) ||
    (is.emptyString(value) && !eok) ||
    (is.emptyObject(value) && !eok)
  )
    return true;
  return false;
}

function getReturnValue(value: unknown, rule: PropertyMapRule) {
  if (!undef(value, rule)) {
    if (rule.value !== undefined) {
      if (is.function_(rule.value)) {
        return rule.value(value, rule);
      }
      return rule.value;
    } else return value;
  } else if (rule.fallback !== undefined) {
    return rule.fallback;
  }
  return undefined;
}
