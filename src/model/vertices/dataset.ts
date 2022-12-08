import _ from 'lodash';
import slugify from '@sindresorhus/slugify';
import {Vertice, VerticeConstructorOptions} from './vertice.js';
import {JsonCollection} from '@salesforce/ts-types';

export interface DataSetConstructorOptions<DataInterface = JsonCollection> extends VerticeConstructorOptions {
  type?: string,
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
 * @template DataInterface = JsonCollection
 * @extends {Vertice}
 */
export class DataSet<DataInterface = JsonCollection> extends Vertice {
  readonly _collection = 'datasets';

  /**
   * Identifier for the dataset type; can be used to group multiple related datasets together.
   *
   * @type {!string}
   */
  type: string;

  /**
   * The unique identifier for this particular dataset.
   *
   * @type {!string}
   */
  name: string;

  /**
   * Raw data for the DataSet; must be JSON-serializable.
   */
  data: DataInterface;

  /**
   * Creates an instance of DataSet.
   *
   * @constructor
   * @param {DataSetConstructorOptions<DataInterface>} input
   */
  constructor(input: DataSetConstructorOptions<DataInterface>) {
    const {type, name, data, ...dataForSuper} = input;
    super(dataForSuper);

    // Flatten the URL to a string
    this.type = type ?? 'default';
    this.name = name;
    this.data = data;

    this.assignKey();
  }

  override assignKey() {
    this._key = DataSet.buildKey(this.name, this.type, this.label);
  }

  /**
   * Given a Dataset name (with optional type and label), generate
   * a compound key that can be used to look up a full Dataset record.
   */
  static buildKey(name: string, type = 'default', label?: string): string {
    const keyParts = [type, name];
    if (label) keyParts.push(label);
    return slugify(keyParts.join('-'), { lowercase: true })
  }
}

Vertice.types.set('datasets', {constructor: DataSet});
