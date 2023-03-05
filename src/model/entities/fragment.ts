import { Entity, EntityConstructorOptions, Reference } from '../index.js';

export interface FragmentConstructorOptions extends EntityConstructorOptions {
  location?: Reference;
}

/**
 * A sub-page content element without a standalone URL of its own.
 *
 * @export
 * @class Fragment
 * @typedef {Fragment}
 * @extends {Entity}
 */
export class Fragment extends Entity {
  readonly _collection = 'fragments';

  /**
   * Optional reference to the graph entity where the fragment was found.
   *
   * NOTE: If an entity ID is passed in as a string it must be a full Arango ID, i.e., 'collection_name/12346...'
   *
   * @param {Entity | string} input
   */
  location?: string;

  /**
   * Creates an instance of a Fragment, with an optional connection to an existing graph Entity.
   *
   * @constructor
   * @param {FragmentConstructorOptions} input
   */
  constructor(input: FragmentConstructorOptions) {
    const { location, ...dataForSuper } = input;
    super(dataForSuper);

    if (location) {
      this.location = Entity.idFromReference(location);
    }
  }
}

Entity.types.set('fragments', { constructor: Fragment });
