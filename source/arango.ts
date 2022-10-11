import is from "@sindresorhus/is";
import { Config } from "arangojs/connection.js";
import { Database } from 'arangojs';
import { Vertice, isEdge, UniqueUrl, RespondsWith, Resource, LinksTo, IsChildOf, IsVariantOf, AppearsOn } from "./model/index.js";
import { DocumentMetadata } from "arangojs/documents.js";
import { DocumentCollection } from "arangojs/collection.js";
import { assert } from "console";

export { aql } from 'arangojs';

// TODO: Alter to follow Crawlee conventions;
// await Arango.open() returns an instance of the Arango class
//   with a particular db loaded;
// await Arango.add/set/etc operates on the database itself

export class Arango {
  systemDb: Database;
  private _activeDb?: Database;

  constructor(options: Partial<Config> = {}) {
    options.url ??= 'http://127.0.0.1:8529';
    this.systemDb = new Database(options);
  }

  /*
   * Load, save, and access working databases
   */

  get db(): Database {
    if (this._activeDb !== undefined) {
      return this._activeDb;
    } else {
      throw new Error('No working database loaded');
    }
  }

  async load(databaseName: string): Promise<Database> {
    if (is.nonEmptyStringAndNotWhitespace(databaseName)) {
      if ((await this.systemDb.listDatabases()).includes(databaseName)) {
        this._activeDb = this.systemDb.database(databaseName);
        await this.initialize();
      } else {
        await this.systemDb.createDatabase(databaseName)
        .then((database) => {
          this._activeDb = database;
          this.initialize();
          return this._activeDb;
        });
      }
    } else {
      return Promise.reject(new Error('No db name given'));
    }

    if (this._activeDb) {
      return Promise.resolve(this._activeDb);
    } else {
      return Promise.reject(new Error('No database loaded, no databasename given'));
    }
  }

  async initialize(): Promise<DocumentCollection[]> {
    const includedTypes = [UniqueUrl, RespondsWith, Resource, LinksTo, IsChildOf, IsVariantOf, AppearsOn];
    assert(includedTypes.length > 0);

    const promises: Promise<DocumentCollection>[] = [];
    for (let type of Vertice.types.keys()) {
      this.db.collection(type).exists().then(exists => {
        if (!exists) {
          if (Vertice.types.get(type)?.isEdge) {
            promises.push(this.db.createEdgeCollection(type));
          } else {
            promises.push(this.db.createCollection(type));
          }
        }
      });
    }
    return Promise.all(promises);
  }

  /*
   * Convenience wrappers for bulk-saving of arbitrary documents
   */

  add(input: Vertice | Vertice[]): Promise<DocumentMetadata[]> {
    return this.set(input, false);
  }

  async set(input: Vertice | Vertice[], overWriteExisting: boolean = true): Promise<DocumentMetadata[]> {
    const promises: Promise<DocumentMetadata>[] = [];
    const overwriteMode = (overWriteExisting) ? 'replace' : 'ignore';
    if (!is.array(input)) input = [input];
    
    // To ensure we don't have any premature reference insertions, we
    // save all vertices before saving edges.
    for (const vertice of input) {
      if (!isEdge(vertice)) {
        promises.push(this.db.collection(vertice._collection)
          .save(vertice.toJSON(), { overwriteMode: overwriteMode }));
      }
    }
    for (const edge of input) {
      if (isEdge(edge)) {
        promises.push(this.db.collection(edge._collection)
          .save(edge.toJSON(), { overwriteMode: overwriteMode }));
      }
    }
    return Promise.all(promises);
  }
}