import { URL } from 'node:url';
import { UniqueUrl } from '../graph/index.js';
import { ParsedUrl, NormalizedUrlSet } from '@autogram/url-tools';

export function getUniqueHosts(input: string[] | URL[] | UniqueUrl[], customPath: string = ''): string[] {
  const result = new NormalizedUrlSet(
    input.map(value => value.toString()), 
    { normalizer: (url: ParsedUrl) => new ParsedUrl(`${url.protocol}${url.hostname}`) }
  );

  return [...result].map(url => url.href + customPath);
}