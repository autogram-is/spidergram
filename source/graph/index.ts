import { Dictionary } from '../util/index.js';

export { UniqueUrl, isUniqueUrl } from './unique-url.js';
export { UniqueUrlSet } from './unique-url-set.js';
export { Status, isStatus } from './status.js';
export { Resource, isResource } from './resource.js';
export { RespondsWith, isRespondsWith } from './responds-with.js';
export { LinksTo, isLinksTo } from './links-to.js';

export {
  Entity,
  isEntity,
  isEntityData,
  Node,
  isNode,
  isNodeData,
  Edge,
  isEdge,
  isEdgeData,
  EntityFilter,
  Match,
  Predicate,
  where,
  Graph,
  NodeSet,
  EdgeSet,
  JsonGraph,
} from '@autogram/autograph';

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
