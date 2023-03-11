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
   */
  fn?: (value: unknown) => unknown | undefined;

  /**
   * If the property is not found, or the selector and fn properties are used but return
   * empty results, return this value as a fallback.
   *
   * Note: If a PropertySource with a default value is placed in the middle of an array of
   * PropertySources, its default value will be returned and all subsequent PropertySources
   * will be ignored.
   */
  default?: unknown;
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
      if (v !== undefined && v !== null) return v;
    } else {
      let v = _.get(object, source.source);
      if (v !== undefined && v !== null) {
        if (source.fn) v = source.fn(v);
        if (typeof v === 'string' && typeof source.selector === 'string') {
          const t = getCheerio(v)(source.selector).first().text().trim();
          if (t.length > 0) return t;
        }
        if (v !== undefined && v !== null) return v;
      }
    }
  }
  return fallback;
}
