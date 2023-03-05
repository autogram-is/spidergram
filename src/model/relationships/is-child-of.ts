import { Resource } from '../index.js';
import { Entity, Reference } from '../entities/entity.js';
import { Relationship, RelationshipConstructorOptions } from './relationship.js';

export type IsChildOfConstructorOptions<
  F extends Entity = Resource,
  T extends Entity = Resource,
> = RelationshipConstructorOptions<F, T> & {
  child?: Reference<F>;
  parent?: Reference<T>;
};

export class IsChildOf<
  F extends Entity = Resource,
  T extends Entity = Resource,
> extends Relationship<F, T> {
  readonly _collection = 'is_child_of';

  constructor(data: IsChildOfConstructorOptions<F, T> = {}) {
    const { child, parent, ...dataForSuper } = data;

    dataForSuper.from ??= child;
    dataForSuper.to ??= parent;

    super(dataForSuper);
  }
}

Entity.types.set('is_child_of', { constructor: IsChildOf, isRelationship: true });
