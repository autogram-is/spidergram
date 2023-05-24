import { Entity, Reference } from './entity.js';
import { NamedEntity, NamedEntityConstructorOptions } from './named-entity.js';

export interface PatternConstructorOptions extends NamedEntityConstructorOptions {
  name?: string;
  parent?: Reference<Pattern>
}

export class Pattern extends NamedEntity {
  readonly _collection = 'patterns';
  parent?: string;

  constructor(data: PatternConstructorOptions = {}) {
    const { parent, ...dataForSuper } = data;
    super(dataForSuper);
    this.parent = parent ? Entity.idFromReference(parent) : undefined;
  }
}

Entity.types.set('patterns', { constructor: Pattern });
