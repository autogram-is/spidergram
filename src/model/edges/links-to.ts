import {Edge, EdgeConstructorOptions, Vertice, Reference, UniqueUrl, Resource} from '../index.js';

export interface LinksToConstructorOptions<F extends Vertice = Resource, T extends Vertice = UniqueUrl> extends EdgeConstructorOptions<F, T> {
  resource?: Reference<F>;
  url?: Reference<T>;
};

export class LinksTo<F extends Vertice = Resource, T extends Vertice = Resource> extends Edge<F, T> {
  readonly _collection = 'links_to';

  constructor(data: LinksToConstructorOptions<F, T> = {}) {
    const {url, resource, ...dataForSuper} = data;

    dataForSuper.from ??= resource;
    dataForSuper.to ??= url;

    super(dataForSuper);
    this.assignKey();
  }

  protected override keySeed(): unknown {
    return null;
  }
}

Vertice.types.set('links_to', {constructor: LinksTo, isEdge: true});
