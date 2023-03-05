import {
  Relationship,
  RelationshipConstructorOptions,
  Entity,
  Reference,
  Resource,
} from '../index.js';

export interface IsVariantOfConstructorOptions<
  F extends Entity = Resource,
  T extends Entity = Resource,
> extends RelationshipConstructorOptions<F, T> {
  variant?: Reference<F>;
  original?: Reference<T>;
}

export class IsVariantOf<
  F extends Entity = Resource,
  T extends Entity = Resource,
> extends Relationship<F, T> {
  readonly _collection = 'is_variant_of';

  constructor(data: IsVariantOfConstructorOptions<F, T> = {}) {
    const { variant, original, ...dataForSuper } = data;

    dataForSuper.from ??= variant;
    dataForSuper.to ??= original;

    super(dataForSuper);
  }
}

Entity.types.set('is_variant_of', { constructor: IsVariantOf, isRelationship: true });
