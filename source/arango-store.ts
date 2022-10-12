import is from "@sindresorhus/is";
import { Config } from "arangojs/connection.js";
import { Database } from 'arangojs';
import { Vertice, isEdge, UniqueUrl, RespondsWith, Resource, LinksTo, IsChildOf, IsVariantOf, AppearsOn } from "./model/index.js";
import { DocumentMetadata } from "arangojs/documents.js";
import { DocumentCollection } from "arangojs/collection.js";
import { assert } from "console";

// TODO: Alter to follow Crawlee conventions;
// await Arango.open() returns an instance of the Arango class
//   with a particular db loaded;
// await Arango.add/set/etc operates on the database itself
export class ArangoStore {
  protected static _systemDb?: Database;
  constructor(protected _activeDb: Database) {}

  /**
   * Arango system information database; acts as a proxy for the current Arango server connection.
   */
   static get system(): Database {
    if (is.undefined(ArangoStore._systemDb)) {
      throw new Error('No arango connection');
    } else {
      return ArangoStore._systemDb!;
    }
  }
  
  /**
   * Connects to the Arango server and stores a connection to the system database.
   * Should be followed by `ArangoStore.load()` in most situations.
   */
  static connect(connection: Partial<Config> = {}): Database {
    connection.url ??= 'http://127.0.0.1:8529';
    ArangoStore._systemDb = new Database(connection);
    return ArangoStore.system;
  }
  
  /**
   * Connects to the Arango server (if necessary) and returns a database instance ready to use
   * with Spidergram data.
   *  
   * @param databaseName 
   * @param connection 
   * @returns 
   */
  static async open(databaseName: string = 'spidergram', connection: Partial<Config> = {}): Promise<ArangoStore> {
    if (is.undefined(ArangoStore._systemDb)) {
      ArangoStore.connect(connection);
    }

    return new ArangoStore(
      await ArangoStore.load(databaseName, true)
    );
  }

  /**
   * Load an Arango database and (optionally) initialize it with collections
   * for all Spidergram entities. Requires an existing connection to Arango.
   * 
   * @param databaseName 
   * @param initialize 
   * @returns 
   */
  protected static async load(databaseName: string, initialize = true): Promise<Database> {
    const system = ArangoStore.system;

    if (is.emptyStringOrWhitespace(databaseName)) {
      return Promise.reject(new Error(`Invalid databaseName '${databaseName}'`));
    }
    return ArangoStore.system.listDatabases()
      .then(databases => {
        if (databases.includes(databaseName)) {
          return system.database(databaseName);
        } else {
          return system.createDatabase(databaseName);
        }
      })
      .then(database => {
        return ArangoStore.initialize(database)
      });
  }

  /**
   * The current active Arango database.
   */
  get db(): Database {
    if (is.undefined(this._activeDb)) {
      throw new Error('No working database loaded');
    } else {
      return this._activeDb!;
    }
  }


  /*
   * Load, save, and access working databases
   */

  static async initialize(database: Database, erase = false): Promise<Database> {
    // Ugly shim to ensure all of our entity types are present before initializing.
    const includedTypes = [UniqueUrl, RespondsWith, Resource, LinksTo, IsChildOf, IsVariantOf, AppearsOn];
    assert(includedTypes.length > 0);

    const promises: Promise<DocumentCollection>[] = [];
    for (let type of Vertice.types.keys()) {
      database.collection(type).exists().then(exists => {
        if (!exists) {
          if (Vertice.types.get(type)?.isEdge) {
            promises.push(database.createEdgeCollection(type));
          } else {
            promises.push(database.createCollection(type));
          }
        }
        else if (erase) {
          database.collection(type).truncate();
        }
      });
    }

    return Promise.all(promises).then(() => database);
  }

  /*
   * Convenience wrappers for bulk saving and deleting of arbitrary documents
   */

  async add(input: Vertice | Vertice[]): Promise<DocumentMetadata[]> {
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

  async delete(input: Vertice | Vertice[]) {
    const promises: Promise<DocumentMetadata>[] = [];
    if (!is.array(input)) input = [input];
    
    // When bulk deleting, remove edges first.
    for (const edge of input) {
      if (isEdge(edge)) {
        promises.push(this.db.collection(edge._collection).remove(edge.id));
      }
    }
    for (const vertice of input) {
      if (!isEdge(vertice)) {
        promises.push(this.db.collection(vertice._collection).remove(vertice.id));
      }
    }
    return Promise.all(promises);
  }

  // Two quick helpers that eliminate unecessary property traversal
  get query() {
    return this.db.query.bind(this.db);
  }
  
  get collection() {
    return this.db.collection.bind(this.db);
  }
}