import {Vertice, VerticeData} from './vertice.js';

export type DataSetData<DataInterface = unknown> = {
  type: string;
  name: string;
  data: DataInterface;
} & VerticeData;

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
  get _collection() {
    return 'datasets';
  }

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
   * @param {DataSetData<DataInterface>} input
   */
  constructor(input: DataSetData<DataInterface>) {
    const {type, data, ...dataForSuper} = input;
    super(dataForSuper);

    // Flatten the URL to a string
    this.type = type;
    this.name = type;
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
    return {type: this.type, name: this.name};
  }
}

Vertice.types.set('datasets', {constructor: DataSet});
