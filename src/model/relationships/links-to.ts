import {
  Relationship,
  RelationshipConstructorOptions,
  Entity,
  Reference,
  UniqueUrl,
  Resource,
} from '../index.js';

export interface LinksToConstructorOptions<
  F extends Entity = Resource,
  T extends Entity = UniqueUrl,
> extends RelationshipConstructorOptions<F, T> {
  from?: Reference<F>;
  to?: Reference<T>;
}

export class LinksTo<
  F extends Entity = Resource,
  T extends Entity = UniqueUrl,
> extends Relationship<F, T> {
  readonly _collection = 'links_to';

  constructor(data: LinksToConstructorOptions<F, T> = {}) {
    super(data);
    this.assignKey();
  }

  protected override keySeed(): unknown {
    return null;
  }
}

Entity.types.set('links_to', { constructor: LinksTo, isRelationship: true });
