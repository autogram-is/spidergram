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

export function mapProperties(
  obj: object,
  map: Record<string, PropertyMap | PropertyMap[]>,
) {
  const domDictionary: Record<string, cheerio.Root> = {};

  for (const [prop, rule] of Object.entries(map)) {
    _.set(obj, prop, findPropertyValue(obj, rule, domDictionary));
  }
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
        if (typeof v === 'string' && typeof source.selector === 'string') {
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

        if (undef(v, source)) {
          if (source.fallback) return source.fallback;
          return undefined;
        } else return v;
      }
    }
  }
  return undefined;
}

/**
 * This internal function applies the filtering logic for potential property values;
 * if `conditions.selector` was populated.
 */
function checkPropertyValue(
  value: unknown,
  conditions: PropertyMapRule,
): unknown {
  if (conditions.eq !== undefined) {
    if (_.isEqual(conditions.eq, value)) {
      return conditions.negate ? undefined : getReturnValue(value, conditions);
    }
  } else if (conditions.gt !== undefined && value) {
    if (value > conditions.gt) {
      return conditions.negate ? undefined : getReturnValue(value, conditions);
    }
  } else if (conditions.lt !== undefined && value) {
    if (value < conditions.lt) {
      return conditions.negate ? undefined : getReturnValue(value, conditions);
    }
  } else if (conditions.in !== undefined && conditions.in.length > 0) {
    let foundMatch = false;
    if (Array.isArray(value)) {
      const returnValue = _.intersection(conditions.in, value);
      if (returnValue.length === 0)
        return getReturnValue(undefined, conditions);
      if (returnValue.length === 1)
        return getReturnValue(returnValue[0], conditions);
      return getReturnValue(returnValue, conditions);
    } else {
      for (const condition of conditions.in) {
        if (_.isEqual(condition, value)) {
          foundMatch = true;
          if (conditions.negate) continue;
          return getReturnValue(value, conditions);
        }
      }
    }
    if (conditions.negate && foundMatch) return undefined;
  } else if (conditions.contains !== undefined) {
    if (Array.isArray(value) && value.includes(conditions.contains)) {
      return conditions.negate ? undefined : getReturnValue(value, conditions);
    }
  } else if (conditions.matching !== undefined) {
    if (typeof value === 'string') {
      if (minimatch(value, conditions.matching)) {
        return conditions.negate
          ? undefined
          : getReturnValue(value, conditions);
      }
    } else if (Array.isArray(value)) {
      const returnList = value
        .map(v => v.toString().trim())
        .filter(
          v =>
            typeof v === 'string' &&
            conditions.matching &&
            minimatch(v, conditions.matching),
        );
      if (conditions.join || returnList.length === 1) {
        return getReturnValue(
          returnList.slice(conditions.limit).join(conditions.join),
          conditions,
        );
      } else {
        return getReturnValue(returnList.slice(conditions.limit), conditions);
      }
    }
  }

  return undefined;
}

function undef(value: unknown, rules?: PropertyMapRule): value is undefined {
  const nok = rules?.acceptNull ?? false;
  const eok = rules?.acceptEmpty ?? false;

  if (
    value === undefined ||
    (value === null && !nok) ||
    (is.emptyArray(value) && !eok) ||
    (is.emptyString(value) && !eok) ||
    (is.emptyObject(value) && !eok)
  )
    return true;
  return false;
}

function getReturnValue(value: unknown, definition: PropertyMapRule) {
  if (value !== undefined) {
    if (definition.value !== undefined) {
      if (is.function_(definition.value)) {
        return definition.value(value, definition);
      }
      return definition.value;
    } else return value;
  } else if (definition.fallback !== undefined) {
    return definition.fallback;
  }
  return undefined;
}
