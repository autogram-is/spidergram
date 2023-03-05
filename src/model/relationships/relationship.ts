import {
  Entity,
  isEntity,
  EntityConstructorOptions,
  Reference,
} from '../entities/entity.js';

export function isRelationship(value: unknown): value is Relationship {
  return isEntity(value) && '_from' in value && '_to' in value;
}

export interface RelationshipConstructorOptions<
  F extends Entity = Entity,
  T extends Entity = Entity,
> extends EntityConstructorOptions {
  from?: Reference<F>;
  to?: Reference<T>;
}

export abstract class Relationship<
  F extends Entity = Entity,
  T extends Entity = Entity,
> extends Entity {
  _from!: string;
  _to!: string;

  // We accept a special-purpose
  constructor(data: RelationshipConstructorOptions<F, T> = {}) {
    const { from, to, ...dataForSuper } = data;
    super(dataForSuper);

    if (from) {
      this._from = Entity.idFromReference(from);
    }

    if (to) {
      this._to = Entity.idFromReference(to);
    }
    this.assignKey();
  }

  protected override keySeed(): unknown {
    return {
      from: this._from,
      label: this.label,
      to: this._to,
    };
  }
}
