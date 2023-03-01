import { Project, ArangoStore } from "../index.js";
import { DocumentCollection, EdgeCollection } from "arangojs/collection";

const INVALID_KEY_CHARS_REGEX = /[^a-zA-Z0-9_:.@()+,=;$!*'%-]/;
const INVALID_COLLECTION_CHARS_REGEX = /[^a-zA-Z0-9_-]/;
const INVALID_COLLECTION_FIRST_CHAR_REGEX = /[^a-zA-Z]/;

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
    if (GenericStore._ast === undefined) {
      const conf = await Project.config();
      GenericStore._ast = await conf.graph();
    }
    return GenericStore._ast.db;
  }

  protected constructor(protected collection: DocumentCollection | EdgeCollection) {
    this.collection = collection;
  }

  protected db() {
    return GenericStore.db();
  }

  protected isValidKey(key: unknown): key is string {
    if (typeof key === 'string') {
      if (key.length < 1) return false;
      if (key.length > 254) return false;
      if (key.match(INVALID_KEY_CHARS_REGEX)) return false;
      return true;
    }
    return false;
  }

  protected isValidName(name: unknown): name is string {
    if (typeof name === 'string') {
      if (name.length < 1) return false;
      if (name.length > 255) return false;
      if (name[0].match(INVALID_COLLECTION_FIRST_CHAR_REGEX)) return false;
      if (name.match(INVALID_COLLECTION_CHARS_REGEX)) return false;
      return true;
    }
    return false;
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
    return this.collection.figures()
      .then(data => { 
        return {
          name: data.name,
          records: data.count,
          size: data.figures['documentsSize'] as number,
          status: data.statusString,
        }
      })
  }
}