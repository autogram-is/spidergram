import { URL } from 'node:url';
import { NormalizedUrl } from '@autogram/url-tools';
import { UrlContext } from './index.js';

export type UrlFilterWithContext<U extends URL = NormalizedUrl, T = unknown> = (foundUrl: U, context?: UrlContext<U, T>) => boolean;

export function sameDomainAsCurrentPage(foundUrl: NormalizedUrl, context: UrlContext): boolean {
  return false;
}