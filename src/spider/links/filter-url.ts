import is from '@sindresorhus/is';
import { ParsedUrl } from '@autogram/url-tools';
import minimatch from 'minimatch';
import arrify from 'arrify';
import { UniqueUrl } from '../../model/index.js';
import { UrlMatchStrategy } from './enqueue-options.js';

/**
 * Returns true if the input URL matches ALL of the specified filters.
 */
export function filterUrlStrict(
  input: UniqueUrl | ParsedUrl,
  filters: FilterInput,
  currentUrl?: ParsedUrl,
): boolean {
  const incomingUrl = input instanceof UniqueUrl ? input.parsed : input;

  if (is.undefined(incomingUrl)) return false;
  if (filters === 'all') return true;
  else if (filters === 'none') return false;
  else if (is.boolean(filters)) return filters;

  for (const filter of arrify(filters)) {
    if (!singleFilter(incomingUrl, filter, currentUrl)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns true if the input URL matches any of the specified filters.
 */
export function filterUrl(
  input: UniqueUrl | ParsedUrl,
  filters: FilterInput = UrlMatchStrategy.SameDomain,
  currentUrl?: ParsedUrl,
): boolean {
  const incomingUrl = input instanceof UniqueUrl ? input.parsed : input;
  if (is.undefined(incomingUrl)) {
    return false;
  }
  if (filters === 'all') return true;
  else if (filters === 'none') return false;
  else if (is.boolean(filters)) return filters;

  for (const filter of arrify(filters)) {
    if (singleFilter(incomingUrl, filter, currentUrl)) {
      return true;
    }
  }

  return false;
}

function singleFilter(
  url: ParsedUrl,
  filter: Filter,
  currentUrl?: ParsedUrl,
): boolean {
  if (is.enumCase(filter, UrlMatchStrategy)) {

    switch (filter) {
      case UrlMatchStrategy.All:
        return true;

      case UrlMatchStrategy.SameDirectory:
        if (currentUrl === undefined) return false;
        if (url.domain !== currentUrl.domain) return false;
        return url.pathname.startsWith(currentUrl.pathname);

      case UrlMatchStrategy.SameDomain:
        if (currentUrl === undefined) return false;
        return url.domain === currentUrl.domain;

      case UrlMatchStrategy.SameHostname:
        if (currentUrl === undefined) return false;
        return url.hostname === currentUrl.hostname;

      default:
        return false;
    }
  } else if (is.string(filter)) {
    // Treat it as a glob to match against the url's href
    return minimatch(url.href, filter, { dot: true });
  } else if (is.regExp(filter)) {
    return url.href.match(filter) !== null;
  } else if (is.function_(filter)) {
    return filter(url, currentUrl);
  }

  return false;
}

// We accept a staggering array of filter types. Come, behold our filters.
export type FilterInput = Filter | Filter[] | boolean;
export type Filter = UrlMatchStrategy | string | RegExp | UrlFilterFunction;

export type UrlFilterFunction = (
  candidate: ParsedUrl,
  current?: ParsedUrl,
) => boolean;
