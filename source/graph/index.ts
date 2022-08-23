import { Dictionary } from '../util/index.js';
export { UniqueUrl } from './unique-url.js';
export { UniqueUrlSet } from './unique-url-set.js';
export { Status } from './status.js';
export { Resource } from './resource.js';
export { RespondsWith } from './responds-with.js';
export { LinksTo } from './links-to.js';
export {
  Graph as GraphLike,
  GraphData,
  GraphStorage,
  MemoryGraph,
  Entity,
  Edge,
  EdgeSelector,
  EntityMap,
  EntityFilter,
} from '@autogram/autograph';

export interface HeaderShape extends Dictionary<number | string | string[]> {}

export interface RequestShape {
  method: string;
  url: string | URL;
  headers: HeaderShape;
  body?: string;
}

export interface ResponseShape {
  url?: string;
  statusCode?: number;
  statusMessage?: string;
  headers: HeaderShape,
  body?: string,
}