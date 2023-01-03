import { Vertice, VerticeConstructorOptions, Reference } from '../index.js';

export interface FragmentConstructorOptions extends VerticeConstructorOptions {
  location?: Reference;
}

/**
 * A sub-page content element without a standalone URL of its own.
 *
 * @export
 * @class Fragment
 * @typedef {Fragment}
 * @extends {Vertice}
 */
export class Fragment extends Vertice {
  readonly _collection = 'fragments';

  /**
   * Optional reference to the graph entity where the fragment was found.
   *
   * NOTE: If an entity ID is passed in as a string it must be a full Arango ID, i.e., 'collection_name/12346...'
   *
   * @param {Vertice | string} input
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
      this.location = Vertice.idFromReference(location);
    }
  }
}

Vertice.types.set('fragments', { constructor: Fragment });
