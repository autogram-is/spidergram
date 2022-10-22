import {Vertice, Edge} from '../../model/index.js';

export interface HierarchyData<V extends Vertice = Vertice, E extends Edge = Edge> {
  participants: V[];
  orphans: V[];
  new: V[];
  relationships: E[];
  hierarchy: Array<HierarchyItem<V>>;
}

export interface HierarchyItem<V extends Vertice = Vertice> {
  item: V;
  children: Array<HierarchyItem<V>>;
}

export interface HierarchyBuilder<V extends Vertice = Vertice, E extends Edge = Edge> {
  data: HierarchyData<V, E>;
  context: string;
  pool: V[];

  loadPool<V>(): Promise<void>;
  loadHierarchy<V>(): Promise<void>;
  buildRelationships(): Promise<void>;
  buildHierarchy(): Promise<void>;
  save(): Promise<void>;
}

export * from './url-hierarchy.js';
