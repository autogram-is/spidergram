import { UniqueUrl } from './unique-url.js';
import { Resource } from './resource.js';
import { Edge, EdgeData } from './edge.js';
import { Vertice, Reference } from './vertice.js';

export type LinksToData<F extends Vertice = Resource, T extends Vertice = UniqueUrl> = EdgeData<F, T> & {
  resource?: Reference<F>;
  url?: Reference<T>;
};

export class LinksTo<F extends Vertice = Resource, T extends Vertice = Resource> extends Edge<F, T> {
  override _collection = 'links_to';

  constructor(data: LinksToData<F, T> = {}) {
    const { url, resource, ...dataForSuper } = data;
    
    dataForSuper.to ??= url;
    dataForSuper.from ??= resource;

    super(dataForSuper);
  }
}

Vertice.types.set('links_to', { constructor: LinksTo, isEdge: true });