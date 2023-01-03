import {
  Edge,
  EdgeConstructorOptions,
  Vertice,
  Reference,
  UniqueUrl,
  Resource,
} from '../index.js';

export interface LinksToConstructorOptions<
  F extends Vertice = Resource,
  T extends Vertice = UniqueUrl,
> extends EdgeConstructorOptions<F, T> {
  from?: Reference<F>;
  to?: Reference<T>;
}

export class LinksTo<
  F extends Vertice = Resource,
  T extends Vertice = UniqueUrl,
> extends Edge<F, T> {
  readonly _collection = 'links_to';

  constructor(data: LinksToConstructorOptions<F, T> = {}) {
    super(data);
    this.assignKey();
  }

  protected override keySeed(): unknown {
    return null;
  }
}

Vertice.types.set('links_to', { constructor: LinksTo, isEdge: true });
