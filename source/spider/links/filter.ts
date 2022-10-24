import is from '@sindresorhus/is';
import {EnqueueStrategy} from 'crawlee';
import {ParsedUrl} from '@autogram/url-tools';
import minimatch from 'minimatch';
import {UniqueUrl} from '../../model/index.js';
import {CombinedContext} from '../index.js';

export function filter(
  context: CombinedContext,
  input: UniqueUrl | ParsedUrl,
  filters: Filter | Filter[],
): boolean {
  const incomingUrl = (input instanceof UniqueUrl) ? input.parsed : input;
  if (is.undefined(incomingUrl)) {
    return false;
  }

  filters = (is.array(filters)) ? filters : [filters];

  for (const filter of filters) {
    if (!singleFilter(context, incomingUrl, filter)) {
      return false;
    }
  }

  return true;
}

function singleFilter(context: CombinedContext, url: ParsedUrl, filter: Filter): boolean {
  const currentUrl = context.uniqueUrl?.parsed;

  if (is.enumCase(filter, EnqueueStrategy)) {
    // We're much lazier than crawlee, and ignore ugly IP address scenarios.
    switch (filter) {
      case EnqueueStrategy.SameDomain:
        if (currentUrl === undefined) {
          return false;
        }

        return url.domain === currentUrl.domain;
      case EnqueueStrategy.SameHostname:
        if (currentUrl === undefined) {
          return false;
        }

        return url.hostname === currentUrl.hostname;
      default:
        return true;
    }
  } else if (is.string(filter)) {
    // Treat it as a glob to match against the url's href
    return minimatch(url.href, filter);
  } else if (is.regExp(filter)) {
    // This is extremely naive; we should rip off crawlee's handling, but this will do for now..
    return url.href.match(filter) !== null;
  } else if (is.function_(filter)) {
    // This hood old fashioned Spidergram UrlFilter function stuff.
    return filter(url, context);
  }

  return false;
}

export type FilterFunction = (link: FilterableLink, context?: CombinedContext) => boolean;
export type FilterableLink = UniqueUrl | ParsedUrl;

// We accept a staggering array of filter types. Come, behold our filters.
export type FilterInput = Filter | Filter[];
export type Filter = string | RegExp | UrlFilterWithContext | EnqueueStrategy;
export type FilterSet = Record<string, FilterInput> & {
  save?: FilterInput;
  enqueue?: FilterInput;
};

export type UrlFilterWithContext = (
  found: ParsedUrl,
  context?: CombinedContext
) => boolean;
