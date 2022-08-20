import { Dictionary } from '@autogram/autograph';

export {
  ParsedUrl,
  NormalizedUrl,
  ParsedUrlSet,
  NormalizedUrlSet,
  UrlFilters,
  UrlMutators,
} from '@autogram/url-tools';

export { Dictionary } from '@autogram/autograph';
export { JsonObject, JsonValue } from 'type-fest';

export type Filter<T> = (input: T, ...args: any[]) => boolean;
export type Mutator<T> = (input: T, ...args: any[]) => T;
export type Extractor<T, D = Dictionary> = (input: T, ...args: any[]) => D;

export interface FilterSet<T> extends Record<string, Filter<T>> {}
export interface MutatorSet<T> extends Record<string, Mutator<T>> {}
export interface ExtractorSet<T, D = Dictionary>
  extends Record<string, Extractor<T, D>> {}

export enum INTERVALS {
  none = 0,
  second = 1000,
  minute = 60 * INTERVALS.second,
  hour = 60 * INTERVALS.minute,
  day = 24 * INTERVALS.hour,
}
