import {Edge, EdgeData, Vertice, Reference, UniqueUrl, Resource} from '../index.js';

export interface LinksToData<F extends Vertice = Resource, T extends Vertice = UniqueUrl> extends EdgeData<F, T> {
  resource?: Reference<F>;
  url?: Reference<T>;
};

export class LinksTo<F extends Vertice = Resource, T extends Vertice = Resource> extends Edge<F, T> {
  readonly _collection  ='links_to';

  constructor(data: LinksToData<F, T> = {}) {
    const {url, resource, ...dataForSuper} = data;

    dataForSuper.from ??= resource;
    dataForSuper.to ??= url;

    super(dataForSuper);
  }
}

Vertice.types.set('links_to', {constructor: LinksTo, isEdge: true});
