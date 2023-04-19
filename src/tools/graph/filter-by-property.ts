import _ from 'lodash';
import minimatch from 'minimatch';

export type ExactFilter = {
  property?: string;
  eq: string;
  reject?: true
};

export type InFilter = {
  property?: string;
  in: string[];
  reject?: true
};

export type GlobFilter = {
  property?: string;
  glob: string;
  reject?: true
};

export type RegexFilter = {
  property?: string;
  regex: string | RegExp;
  reject?: true;
};

export type PropertyFilter = ExactFilter | InFilter | GlobFilter | RegexFilter;

/**
 * A too-clever for its own good filtering function.
 */
export function filterByProperty(input: object, filter: PropertyFilter): boolean {
  let result: boolean | undefined = undefined;

  // Populate 'value' with the property value. If there's no property pointer,
  // toString() the input and use it for comparison.
  const value = (filter.property ? _.get(input, filter.property, false) : input).toString();

  if ('eq' in filter && filter.eq) {
    result = value === filter.eq
  } else if ('in' in filter && filter.in) {
    result = filter.in?.includes(value)
  } else if ('glob' in filter && filter.glob) {
    result = minimatch(value, filter.glob);
  } else if ('regex' in filter && filter.regex) {
    const regex = typeof filter.regex === 'string' ? new RegExp(filter.regex) : filter.regex;
    result = regex.test(value);
  }

  // If none of the filter conditions were present, just return the value of 'reject' if it exists
  if (result === undefined) return !!filter.reject;

  // Otherwise, return result — but negate it if 'reject' is true.
  return filter.reject ? !result : result;
}

/**
 * Returns a propertyFilter function; this can be used with Array.filter()
 * to quickly find objects that match a filter function.
 */
export function byProperty(filter: PropertyFilter) {
  return (input: object) => filterByProperty(input, filter);
}