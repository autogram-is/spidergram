import { Spidergram, ArangoStore } from '../index.js';
import { DocumentCollection, EdgeCollection } from 'arangojs/collection';

/**
 * Parent class for our generic data bucket classes. It handles ensuring there's a
 * connection to the Arango database, as well as dropping, emptying, and compacting
 * said collections.
 */
export abstract class GenericStore {
  protected static _ast?: ArangoStore;
  protected static _prefix: string | false = false;

  protected static prefix(friendlyName: string) {
    if (this._prefix) {
      return this._prefix + friendlyName;
    } else {
      return friendlyName;
    }
  }

  protected static async db() {
    return Spidergram.load().then(sg => sg.arango.db);
  }

  protected constructor(
    protected collection: DocumentCollection | EdgeCollection,
  ) {
    this.collection = collection;
  }

  protected async db() {
    return Spidergram.load().then(sg => sg.arango.db);
  }

  async drop() {
    return this.collection.drop();
  }

  async empty() {
    return this.collection.truncate();
  }

  async compact() {
    return this.collection.compact();
  }

  async info() {
    return this.collection.figures().then(data => {
      return {
        name: data.name,
        records: data.count,
        size: data.figures['documentsSize'] as number,
        status: data.statusString,
      };
    });
  }
}
