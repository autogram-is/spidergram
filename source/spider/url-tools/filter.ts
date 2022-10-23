import {CombinedContext} from '../index.js';
import {RegExpInput, GlobInput, EnqueueStrategy, Request } from 'crawlee';
import {ParsedUrl} from '@autogram/url-tools';
import {UniqueUrl} from '../../model/index.js';
import {HtmlLink} from '../index.js';

export type FilterableLink = UniqueUrl | ParsedUrl | Request | HtmlLink | string;

// We accept a staggering array of filter types. Come, behold our filters.
export type FilterInput = Filter | FilterArray;
export type Filter = RegExpInput | GlobInput | UrlFilterWithContext | EnqueueStrategy | boolean;
export type FilterArray = RegExpInput[] | GlobInput[] | UrlFilterWithContext[];
export type FilterSet = Record<string, FilterArray | FilterArray> & {
  save?: FilterInput,
  enqueue?: FilterInput,
  process?: FilterInput,
  download?: FilterInput,
}

export type UrlFilterWithContext = (
  found: ParsedUrl,
  context?: CombinedContext
) => boolean;

export async function filter<
  T extends FilterableLink = UniqueUrl
> (
  input: T[],
  filter?: FilterInput,
  strategy?: EnqueueStrategy,
  context?: CombinedContext
): Promise<T[]> {
  throw new Error('Not yet implemented');
}