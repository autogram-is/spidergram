import { ArangoCollection, isArangoCollection } from 'arangojs/collection.js';
import { AqStrict, AqQuery, AqBuilder } from 'aql-builder';
import { Query } from './query.js';
import { Entity } from '../../index.js';
import { JsonMap } from '@salesforce/ts-types';

export class EntityQuery<T extends Entity = Entity> extends AqBuilder {
  /**
   * Returns a new {@link AqBuilder} containing a buildable {@link AqStrict}.
   */
  constructor(input: string | ArangoCollection | AqStrict | AqQuery) {
    const validCollections = Object.keys(Entity.types);
    let collectionName = '';

    if (typeof input === 'string') {
      collectionName = input;
    } else if (isArangoCollection(input)) {
      collectionName = input.name;
    } else {
      if (isArangoCollection(input.collection)) {
        collectionName = input.collection.name;
      } else {
        collectionName = input.collection;
      }
    }

    if (!validCollections.includes(collectionName)) {
      throw new Error(`'${collectionName}' is not a valid entity collection`);
    }
    super(input);

    // We want the full entity data; kill the 'return' array.
    this.spec.return = [];
  }

  // We don't allow alteration of the return value; we may want to
  // log or throw an error here.
  override return(): this {
    return this;
  }

  async run(): Promise<T[]> {
    return Query.run<JsonMap>(this.build()).then(results =>
      results.map(item => Entity.fromJSON(item) as T),
    );
  }
}
