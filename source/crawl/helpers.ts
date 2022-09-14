import { URL } from 'node:url';
import { ParsedUrl, NormalizedUrlSet } from '@autogram/url-tools';
import { UniqueUrl } from '../graph/index.js';

export function getUniqueHosts(
  input: string[] | URL[] | UniqueUrl[],
  customPath = '',
): string[] {
  const result = new NormalizedUrlSet(
    input.map((value) => value.toString()),
    {
      normalizer: (url: ParsedUrl) =>
        new ParsedUrl(`${url.protocol}${url.hostname}`),
    },
  );

  return [...result].map((url) => url.href + customPath);
}
