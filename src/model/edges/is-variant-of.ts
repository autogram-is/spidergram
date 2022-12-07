import {Edge, EdgeConstructorOptions, Vertice, Reference, Resource} from '../index.js';

export interface IsVariantOfConstructorOptions<F extends Vertice = Resource, T extends Vertice = Resource> extends EdgeConstructorOptions<F, T> {
  variant?: Reference<F>;
  original?: Reference<T>;
};

export class IsVariantOf<F extends Vertice = Resource, T extends Vertice = Resource> extends Edge<F, T> {
  readonly _collection = 'is_variant_of';

  constructor(data: IsVariantOfConstructorOptions<F, T> = {}) {
    const {variant, original, ...dataForSuper} = data;

    dataForSuper.from ??= variant;
    dataForSuper.to ??= original;

    super(dataForSuper);
  }
}

Vertice.types.set('is_variant_of', {constructor: IsVariantOf, isEdge: true});
