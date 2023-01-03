import { Resource } from '../index.js';
import { Vertice, Reference } from '../vertices/vertice.js';
import { Edge, EdgeConstructorOptions } from './edge.js';

export type IsChildOfConstructorOptions<
  F extends Vertice = Resource,
  T extends Vertice = Resource,
> = EdgeConstructorOptions<F, T> & {
  child?: Reference<F>;
  parent?: Reference<T>;
};

export class IsChildOf<
  F extends Vertice = Resource,
  T extends Vertice = Resource,
> extends Edge<F, T> {
  readonly _collection = 'is_child_of';

  constructor(data: IsChildOfConstructorOptions<F, T> = {}) {
    const { child, parent, ...dataForSuper } = data;

    dataForSuper.from ??= child;
    dataForSuper.to ??= parent;

    super(dataForSuper);
  }
}

Vertice.types.set('is_child_of', { constructor: IsChildOf, isEdge: true });
