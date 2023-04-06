import is from '@sindresorhus/is';
import { NormalizedUrl, ParsedUrl } from '@autogram/url-tools';
import minimatch from 'minimatch';
import arrify from 'arrify';
import { UrlMatchStrategy } from './url-match-strategy.js';
import _ from 'lodash';

export interface UrlFilterOptions {
  mode?: 'any' | 'all' | 'none';
  contextUrl?: string | URL;
}

/**
 * Filters an array of incoming ParsedURL instances using the UrlFilterInput rules
 * supplied in the second parameter.
 */
export function filterUrls<T extends ParsedUrl = ParsedUrl>(
  input: T[],
  filters: UrlFilterInput = UrlMatchStrategy.SameDomain,
  options: UrlFilterOptions = {},
): T[] {
  return input.filter(url => filterUrl(url, filters, options));
}

/**
 * Returns true if the input URL matches the specified filters.
 *
 * `options.contextUrl` must be supplied when using UrlMatchStrategy filters.
 * `options.mode` defaults to `any`, meaning that a URL will be 'matched' if
 * any of the filters return TRUE. `all` and `none` modes can change that behavior
 * to strict pass/fail of all filters.
 */
export function filterUrl(
  input: ParsedUrl,
  filters: UrlFilterInput = UrlMatchStrategy.SameDomain,
  options: UrlFilterOptions = {},
): boolean {
  let contextUrl: ParsedUrl | undefined = undefined;
  if (options.contextUrl) {
    if (options.contextUrl instanceof (ParsedUrl || NormalizedUrl)) {
      contextUrl = options.contextUrl;
    } else {
      contextUrl = new ParsedUrl(options.contextUrl.toString());
    }
  }

  if (filters === 'all') return true;
  else if (filters === 'none') return false;
  else if (is.boolean(filters)) return filters;
  let softAccept = false;

  switch (options.mode) {
    case 'all':
      // 'all' mode is a strict filter that only passes URLs if EVERY filter returns TRUE.
      for (const filter of arrify(filters)) {
        const accept = singleFilter(input, filter, contextUrl);
        if (!accept) return false;
      }
      return true;

    case 'none':
      // 'none' is an inverse check, only passing URLs if EVERY filter returns FALSE.
      for (const filter of arrify(filters)) {
        const accept = singleFilter(input, filter, contextUrl);
        if (accept) return false;
      }
      return true;

    default:
      // Normal mode ('any') passes URLs if AT LEAST ONE filter returns TRUE.
      for (const filter of arrify(filters)) {
        const accept = singleFilter(input, filter, contextUrl);
        if (accept === null) return false;
        if (accept === true) softAccept = true;
      }
      if (softAccept) return true;
  }

  return false;
}

// This is a bit tricky; we return a boolean OR a null; the null, confusingly, 
function singleFilter(
  url: ParsedUrl,
  filter: UrlFilter,
  contextUrl?: ParsedUrl,
): boolean | null {
  if (is.enumCase(filter, UrlMatchStrategy)) {
    switch (filter) {
      case UrlMatchStrategy.All:
        return true;

      case UrlMatchStrategy.SameDirectory:
        if (contextUrl === undefined) return false;
        if (url.domain !== contextUrl.domain) return false;
        return url.pathname.startsWith(contextUrl.pathname);

      case UrlMatchStrategy.SameDomain:
        if (contextUrl === undefined) return false;
        return url.domain === contextUrl.domain;

      case UrlMatchStrategy.SameHostname:
        if (contextUrl === undefined) return false;
        return url.hostname === contextUrl.hostname;

      default:
        return false;
    }
  } else if (isUrlRegexFilter(filter)) {
    const regex = is.regExp(filter.regex)
      ? filter.regex
      : new RegExp(filter.regex);
    const accept = regex.test(
      _.get(url.properties as object, filter.property ?? 'href', ''),
    );
    if (filter.reject) {
      return accept ? null : true
    }
    return accept
  } else if (is.regExp(filter)) {
    return filter.test(url.href);
  } else if (isUrlGlobFilter(filter)) {
    const accept = minimatch(
      _.get(url.properties as object, filter.property ?? 'href', ''),
      filter.glob,
      { dot: true },
    );
    if (filter.reject) {
      return accept ? null : true
    }
    return accept
  } else if (is.string(filter)) {
    // Treat it as a glob to match against the url's href
    return minimatch(url.href, filter, { dot: true });
  } else if (is.function_(filter)) {
    return filter(url, contextUrl);
  }

  return false;
}

// We accept a staggering array of filter types. Come, behold our filters.
export type UrlFilter =
  | UrlMatchStrategy
  | string
  | UrlGlobFilter
  | RegExp
  | UrlRegexFilter
  | UrlFilterFunction;
export type UrlFilterInput = UrlFilter | UrlFilter[] | boolean;

export function isUrlGlobFilter(input: unknown): input is UrlGlobFilter {
  return is.plainObject(input) && is.string(input.glob);
}

export function isUrlRegexFilter(input: unknown): input is UrlRegexFilter {
  return (
    is.plainObject(input) && (is.string(input.regex) || is.regExp(input.regex))
  );
}

export type UrlGlobFilter = { property?: string, glob: string, reject?: true };
export type UrlRegexFilter = { property?: string, regex: string | RegExp, reject?: true };
export type UrlFilterFunction = (
  candidate: ParsedUrl,
  current?: ParsedUrl,
) => boolean;
