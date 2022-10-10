import { UniqueUrl } from './unique-url.js';
import { Resource } from './resource.js';
import { Edge, EdgeData } from './edge.js';
import { Vertice, Reference } from './vertice.js';

export type LinksToData = {
  resource?: Reference<Resource>;
  url?: Reference<UniqueUrl>;
} & EdgeData;

export class LinksTo extends Edge {
  override _collection = 'links_to';

  constructor(data: LinksToData = {}) {
    const { url, resource, ...dataForSuper } = data;
    
    dataForSuper.from ??= resource;
    dataForSuper.to ??= url;

    super(dataForSuper);
  }
}

Vertice.types.set('links_to', { constructor: LinksTo, isEdge: true });