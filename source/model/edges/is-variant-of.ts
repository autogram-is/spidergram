import { Edge, EdgeData, Vertice, Reference, Resource } from '../index.js';

export type IsVariantOfData<F extends Vertice = Resource, T extends Vertice = Resource> = EdgeData<F, T> & {
  variant?: Reference<F>
  original?: Reference<T>
  context?: string
};

export class IsVariantOf<F extends Vertice = Resource, T extends Vertice = Resource> extends Edge<F, T> {
  override _collection = 'is_variant_of';
  context!: string

  constructor(data: IsVariantOfData<F, T> = {}) {
    const { variant, original, context, ...dataForSuper } = data;
    
    dataForSuper.from ??= variant;
    dataForSuper.to ??= original;

    super(dataForSuper);

    this.context = context ?? 'url';
  }
}

Vertice.types.set('is_variant_of', { constructor: IsVariantOf, isEdge: true });