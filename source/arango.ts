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
  protected static _activeDb?: Database;

  protected constructor(options: Partial<Config> = {}) {
    options.url ??= 'http://127.0.0.1:8529';
    ArangoStore._systemDb = new Database(options);
  }

  /**
   * The current active Arango database.
   */
  static get db(): Database {
    if (is.undefined(ArangoStore._activeDb)) {
      throw new Error('No working database loaded');
    } else {
      return ArangoStore._activeDb!;
    }
  }

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

  /*
   * Load, save, and access working databases
   */


  /**
   * Connects to the Arango server (if necessary) and returns a database instance ready to use
   * with Spidergram data.
   *  
   * @param databaseName 
   * @param connection 
   * @returns 
   */
  static async open(databaseName: string = 'spidergram', connection: Partial<Config> = {}): Promise<Database> {
    if (is.undefined(ArangoStore._systemDb)) {
      ArangoStore.connect(connection);
    }

    if (is.undefined(ArangoStore._activeDb) || ArangoStore._activeDb.name != databaseName) {
      return this.load(databaseName, true, true)
        .then(database => {
          return database;
        })
    } else {
      return Promise.resolve(ArangoStore.db);
    }
  }

  /**
   * Load an Arango database and (optionally) initialize it with collections
   * for all Spidergram entities. Requires an existing connection to Arango.
   * 
   * @param databaseName 
   * @param initialize 
   * @param setActiveDatabase 
   * @returns 
   */
  protected static async load(databaseName: string, initialize = true, setActiveDatabase = true): Promise<Database> {
    if (is.undefined(ArangoStore._systemDb)) {
      return Promise.reject(new Error('No connection to Arango server'));
    } else {
      if (is.emptyStringOrWhitespace(databaseName)) {
        return Promise.reject(new Error(`Invalid databaseName '${databaseName}'`));
      }
      return this.system.listDatabases()
        .then(databases => {
          if (databases.includes(databaseName)) {
            return this.system.database(databaseName);
          } else {
            return this.system.createDatabase(databaseName);
          }
        })
        .then(database => {
          if (setActiveDatabase) ArangoStore._activeDb = database;
          return this.initialize(database)
        });
    }
  }

  static async initialize(database?: Database, erase = false): Promise<Database> {
    // Ugly shim to ensure all of our entity types are present before initializing.
    const includedTypes = [UniqueUrl, RespondsWith, Resource, LinksTo, IsChildOf, IsVariantOf, AppearsOn];
    assert(includedTypes.length > 0);

    const workingDb = database ?? ArangoStore.db;

    const promises: Promise<DocumentCollection>[] = [];
    for (let type of Vertice.types.keys()) {
      workingDb.collection(type).exists().then(exists => {
        if (!exists) {
          if (Vertice.types.get(type)?.isEdge) {
            promises.push(workingDb.createEdgeCollection(type));
          } else {
            promises.push(workingDb.createCollection(type));
          }
        }
        else if (erase) {
          workingDb.collection(type).truncate();
        }
      });
    }

    return Promise.all(promises).then(() => workingDb);
  }

  /*
   * Convenience wrappers for bulk saving and deleting of arbitrary documents
   */

  static add(input: Vertice | Vertice[], database?: Database): Promise<DocumentMetadata[]> {
    return ArangoStore.set(input, database, false);
  }

  static async set(input: Vertice | Vertice[], database?: Database, overWriteExisting: boolean = true): Promise<DocumentMetadata[]> {
    const promises: Promise<DocumentMetadata>[] = [];
    const workingDb = database ?? ArangoStore.db;
    const overwriteMode = (overWriteExisting) ? 'replace' : 'ignore';
    if (!is.array(input)) input = [input];
    
    // To ensure we don't have any premature reference insertions, we
    // save all vertices before saving edges.
    for (const vertice of input) {
      if (!isEdge(vertice)) {
        promises.push(workingDb.collection(vertice._collection)
          .save(vertice.toJSON(), { overwriteMode: overwriteMode }));
      }
    }
    for (const edge of input) {
      if (isEdge(edge)) {
        promises.push(workingDb.collection(edge._collection)
          .save(edge.toJSON(), { overwriteMode: overwriteMode }));
      }
    }
    return Promise.all(promises);
  }

  static async delete(input: Vertice | Vertice[], database?: Database) {
    const promises: Promise<DocumentMetadata>[] = [];
    const workingDb = database ?? ArangoStore.db;
    if (!is.array(input)) input = [input];
    
    // When bulk deleting, remove edges first.
    for (const edge of input) {
      if (isEdge(edge)) {
        promises.push(workingDb.collection(edge._collection).remove(edge.id));
      }
    }
    for (const vertice of input) {
      if (!isEdge(vertice)) {
        promises.push(workingDb.collection(vertice._collection).remove(vertice.id));
      }
    }
    return Promise.all(promises);
  }
}