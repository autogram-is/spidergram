import { URL } from 'node:url';
import { NormalizedUrl } from '@autogram/url-tools';
import { UrlContext } from './index.js';

export type UrlMutatorWithContext<U extends URL = NormalizedUrl, T = unknown> = (foundUrl: U, context?: UrlContext<U, T>) => U;