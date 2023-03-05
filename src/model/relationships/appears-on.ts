import {
  Relationship,
  RelationshipConstructorOptions,
  Entity,
  Reference,
  Resource,
} from '../index.js';

export interface AppearsOnConstructorOptions<
  F extends Entity = Entity,
  T extends Entity = Resource,
> extends RelationshipConstructorOptions<F, T> {
  item?: Reference<F>;
  location?: Reference<T>;
}

export class AppearsOn<
  F extends Entity = Entity,
  T extends Entity = Resource,
> extends Relationship<F, T> {
  readonly _collection = 'appears_on';

  constructor(data: AppearsOnConstructorOptions<F, T> = {}) {
    const { item, location, ...dataForSuper } = data;

    dataForSuper.from ??= item;
    dataForSuper.to ??= location;

    super(dataForSuper);
  }
}

Entity.types.set('appears_on', { constructor: AppearsOn, isRelationship: true });
