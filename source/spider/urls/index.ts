import { URL } from 'node:url';
import { NormalizedUrl } from '@autogram/url-tools';
import { UniqueUrl } from '../../model/unique-url.js';

export type UrlLike = UniqueUrl | NormalizedUrl | string;
export interface UrlContext<U extends URL = NormalizedUrl, T = unknown> {
  current?: U,
  referer?: U,
  options?: Record<string, T>,
}

export * from './filters.js';
export * from './mutators.js';
export * from './build-requests.js';