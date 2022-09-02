import { Dictionary } from '@autogram/autograph';

export type Filter<T> = (input: T, ...args: any[]) => boolean;
export type Mutator<T> = (input: T, ...args: any[]) => T;
export type Extractor<T, D = Dictionary> = (input: T, ...args: any[]) => D;

export interface FilterSet<T> extends Record<string, Filter<T>> {}
export interface MutatorSet<T> extends Record<string, Mutator<T>> {}
export interface ExtractorSet<T, D = Dictionary>
  extends Record<string, Extractor<T, D>> {}

export interface HeaderShape extends Dictionary<string | string[]> {}

export interface RequestShape {
  method: string;
  url: string | URL;
  headers: HeaderShape;
  body?: string;
}

export interface ResponseShape {
  url: string;
  statusCode?: number;
  statusMessage?: string;
  headers: HeaderShape;
  body?: string;
}

export enum INTERVALS {
  none = 0,
  second = 1000,
  minute = 60_000,
  hour = 3_600_000,
  day = 86_400_000,
}
