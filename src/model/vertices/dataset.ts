import {Vertice, VerticeConstructorOptions} from './vertice.js';

export interface DataSetConstructorOptions<DataInterface = unknown> extends VerticeConstructorOptions {
  name: string;
  data: DataInterface;
};

/**
 * General-purpose storage for imported and third-party API data.
 *
 *
 * @export
 * @class DataSet
 * @typedef {DataSet}
 * @template DataInterface = unknown
 * @extends {Vertice}
 */
export class DataSet<DataInterface = unknown> extends Vertice {
  readonly _collection = 'datasets';
  
  /**
   * Description placeholder
   *
   * @type {!string}
   */
  type!: string;
  /**
   * Description placeholder
   *
   * @type {!string}
   */
  name!: string;
  /**
   * Description placeholder
   *
   * @type {!DataInterface}
   */
  data!: DataInterface;

  /**
   * Creates an instance of DataSet.
   *
   * @constructor
   * @param {DataSetConstructorOptions<DataInterface>} input
   */
  constructor(input: DataSetConstructorOptions<DataInterface>) {
    const {name, data, ...dataForSuper} = input;
    super(dataForSuper);

    // Flatten the URL to a string
    this.name = name;
    this.data = data;
  }

  /**
   * Description placeholder
   *
   * @protected
   * @override
   * @returns {unknown}
   */
  protected override keySeed(): unknown {
    return {label: this.label, name: this.name};
  }
}

Vertice.types.set('datasets', {constructor: DataSet});
