import { Entity } from './entity.js';
import { NamedEntity, NamedEntityConstructorOptions } from './named-entity.js';

export class Pattern extends NamedEntity {
  readonly _collection = 'patterns';

  constructor(data: NamedEntityConstructorOptions = {}) {
    const { ...dataForSuper } = data;
    super(dataForSuper);
  }
}

Entity.types.set('patterns', { constructor: Pattern });
