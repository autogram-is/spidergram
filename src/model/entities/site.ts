import { Entity, Reference } from './entity.js';
import { NamedEntity, NamedEntityConstructorOptions } from './named-entity.js';

export interface SiteConstructorOptions extends NamedEntityConstructorOptions {
  name?: string;
  parent?: Reference<Site>
}

/**
 * An entity representing a single web site; it can be used to
 * associate 
 */
export class Site extends NamedEntity {
  readonly _collection = 'sites';
  parent?: string;

  constructor(data: SiteConstructorOptions = {}) {
    const { parent, ...dataForSuper } = data;
    super(dataForSuper);
    this.parent = parent ? Entity.idFromReference(parent) : undefined;
  }
}

Entity.types.set('sites', { constructor: Site });
