import {
  Entity,
  Expose,
  Transform
} from './entity.js';
import { NamedEntity, NamedEntityConstructorOptions } from './named-entity.js';

export interface SiteConstructorOptions extends NamedEntityConstructorOptions {
  name?: string;
  urls?: (string | URL)[];
}

export class Site extends NamedEntity {
  readonly _collection = 'sites';
  
  /**
   * A list of URLs that can be used to access this site
   */
  @Expose()
  @Transform(transformation => {
    if (transformation.type === 0) {
      // Plain to class
      return new Set<string>(transformation.value);
    } else if (transformation.type === 1) {
      // Class to plain
      return transformation.value
        ? [...(transformation.value as Set<string>).values()]
        : [];
    } else {
      // Class to class
      return transformation;
    }
  })
  urls!: Set<string>;

  constructor(data: SiteConstructorOptions = {}) {
    const { urls, ...dataForSuper } = data;
    super(dataForSuper);

    this.urls = new Set<string>(
      [...(urls ?? []).map(u => u.toString())]
    );
  }
}

Entity.types.set('sites', { constructor: Site });
