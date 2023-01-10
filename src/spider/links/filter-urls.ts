import is from '@sindresorhus/is';
import { ParsedUrl } from '@autogram/url-tools';
import minimatch from 'minimatch';
import arrify from 'arrify';
import { UniqueUrl } from '../../model/index.js';
import { SpiderContext, UrlMatchStrategy } from '../index.js';

export function filterUrls(
  context: SpiderContext,
  input: UniqueUrl | ParsedUrl,
  filters: FilterInput,
): boolean {
  const incomingUrl = input instanceof UniqueUrl ? input.parsed : input;
  if (is.undefined(incomingUrl)) {
    return false;
  }

  if (is.boolean(filters)) return filters;

  for (const filter of arrify(filters)) {
    if (!singleFilter(context, incomingUrl, filter)) {
      return false;
    }
  }

  return true;
}

function singleFilter(
  context: SpiderContext,
  url: ParsedUrl,
  filter: Filter,
): boolean {
  const currentUrl = context.uniqueUrl?.parsed;

  if (is.enumCase(filter, UrlMatchStrategy)) {
    // We're much lazier than crawlee, and ignore ugly IP address scenarios.
    switch (filter) {
      case UrlMatchStrategy.None: 
        return false;
        
      case UrlMatchStrategy.SameDomain:
        if (currentUrl === undefined) {
          return false;
        }

        return url.domain === currentUrl.domain;
      case UrlMatchStrategy.SameHostname:
        if (currentUrl === undefined) {
          return false;
        }

        return url.hostname === currentUrl.hostname;
      default:
        return true;
    }
  } else if (is.string(filter)) {
    // Treat it as a glob to match against the url's href
    return minimatch(url.href, filter, { dot: true });
  } else if (is.regExp(filter)) {
    // This is extremely naive; we should rip off crawlee's handling, but this will do for now..
    return url.href.match(filter) !== null;
  } else if (is.function_(filter)) {
    // This hood old fashioned Spidergram UrlFilter function stuff.
    return filter(url, context);
  }

  return false;
}

export type FilterFunction = (
  link: FilterableLink,
  context?: SpiderContext,
) => boolean;
export type FilterableLink = UniqueUrl | ParsedUrl;

// We accept a staggering array of filter types. Come, behold our filters.
export type FilterInput = Filter | Filter[] | boolean;
export type Filter = string | RegExp | UrlFilterWithContext | UrlMatchStrategy;

export type UrlFilterWithContext = (
  found: ParsedUrl,
  context?: SpiderContext,
) => boolean;
