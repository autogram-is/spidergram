import {Edge, EdgeData, Vertice, Reference, Resource} from '../index.js';

export interface IsVariantOfData<F extends Vertice = Resource, T extends Vertice = Resource> extends EdgeData<F, T> {
  variant?: Reference<F>;
  original?: Reference<T>;
};

export class IsVariantOf<F extends Vertice = Resource, T extends Vertice = Resource> extends Edge<F, T> {
  readonly _collection = 'is_variant_of';

  constructor(data: IsVariantOfData<F, T> = {}) {
    const {variant, original, label, ...dataForSuper} = data;

    dataForSuper.from ??= variant;
    dataForSuper.to ??= original;

    super(dataForSuper);
  }
}

Vertice.types.set('is_variant_of', {constructor: IsVariantOf, isEdge: true});
