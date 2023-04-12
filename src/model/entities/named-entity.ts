import {
  Entity,
  EntityConstructorOptions,
} from './entity.js';
import { sanitizeKey } from '../index.js';

export interface NamedEntityConstructorOptions extends EntityConstructorOptions {
  key?: string;
  name?: string;
  description?: string;
}

/**
 * A convenience abstraction for Entity types that are meant to have meaningful
 * unique IDs — essentially, a human-friendly name that is also their database key.
 */
export abstract class NamedEntity extends Entity {
  name!: string;
  description?: string;

  constructor(data: NamedEntityConstructorOptions = {}) {
    const { key, name, description, ...dataForSuper } = data;
    super(dataForSuper);
    
    // We should test for missing key/name, but things get squirrelly during
    // serialization (IE, the incoming value is actaully '_key')

    // Worst case scenario, we end up with an entity whose name is a UUID
    this._key = sanitizeKey(key ?? name ?? this._key);
    this.name = name ?? key ?? this._key;
    this.description = description;
  }
}
