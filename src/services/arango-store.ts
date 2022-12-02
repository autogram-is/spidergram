import {assert} from 'node:console';
import is from '@sindresorhus/is';
import {Config} from 'arangojs/connection.js';
import {Database} from 'arangojs';
import {DocumentMetadata} from 'arangojs/documents.js';
import {DocumentCollection} from 'arangojs/collection.js';
import arrify from 'arrify';
import slugify from '@sindresorhus/slugify';
import {Vertice, VerticeData, isEdge, UniqueUrl, RespondsWith, Resource, LinksTo, IsChildOf, IsVariantOf, AppearsOn, DataSet, Fragment} from '../model/index.js';
import { Project } from './project.js';

export {aql} from 'arangojs';

export class ArangoStore {
  protected static _systemDb?: Database;
  constructor(protected _activeDb: Database) {}
  protected static instances: Record<string, ArangoStore> = {};

  /**
   * Arango system information database; acts as a proxy for the current Arango server connection.
   */
  static get system(): Database {
    if (is.undefined(ArangoStore._systemDb)) {
      throw new Error('No arango connection');
    } else {
      return ArangoStore._systemDb;
    }
  }

  /**
   * Connects to the Arango server and stores a connection to the system database.
   * Should be followed by `ArangoStore.load()` in most situations.
   */
  protected static connect(connection: Partial<Config> = {}): Database {
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
  static async open(name?: string, customConnection: Partial<Config> = {}): Promise<ArangoStore> {
    const project = await Project.config();
    const { databaseName, ...connection } =  project.configuration.graph.connection;

    const dbName = name ?? databaseName ?? 'spidergram';
    const dbConn = customConnection ?? connection;

    if (is.undefined(ArangoStore._systemDb)) {
      ArangoStore.connect(dbConn);
      await this.system.databases()
        .catch((error: unknown) => { 
          if (is.error(error)) throw error;
          throw new Error('Could not connect to Arango');
        });
    }

    if (is.undefined(ArangoStore.instances[dbName])) {
      ArangoStore.instances[dbName] = new ArangoStore(await ArangoStore.load(dbName));
    }

    return ArangoStore.instances[dbName];
  }

  /**
   * Load an Arango database and (optionally) initialize it with collections
   * for all Spidergram entities. Requires an existing connection to Arango.
   *
   * @param databaseName
   * @param initialize
   * @returns
   */
  protected static async load(name: string, initialize = true): Promise<Database> {
    const {system} = ArangoStore;

    if (is.emptyStringOrWhitespace(name)) {
      throw new Error(`Invalid database '${name}'`);
    } else {
      name = slugify(name);
    }

    return ArangoStore.system.listDatabases()
      .then(databases => 
        databases.includes(name) ? 
          system.database(name) : 
          system.createDatabase(name)
        )
      .then(database => ArangoStore.initialize(database));
  }

  /**
   * Closes the connection to Arango for this database.
   */
  close(): void {
    delete ArangoStore.instances[this.db.name];
    this.db.close();
  }

  /**
   * The current active Arango database.
   */
  get db(): Database {
    if (is.undefined(this._activeDb)) {
      throw new Error('No working database loaded');
    } else {
      return this._activeDb;
    }
  }

  /*
   * Load, save, and access working databases
   */

  static async initialize(database: Database, erase = false): Promise<Database> {
    // Ugly shim to ensure all of our entity types are present before initializing.
    const includedTypes = [UniqueUrl, RespondsWith, Resource, DataSet, LinksTo, IsChildOf, IsVariantOf, AppearsOn, Fragment];
    assert(includedTypes.length > 0);

    const promises: Array<Promise<DocumentCollection>> = [];
    for (const type of Vertice.types.keys()) {
      await database.collection(type).exists().then(exists => {
        if (!exists) {
          if (Vertice.types.get(type)?.isEdge) {
            promises.push(database.createEdgeCollection(type));
          } else {
            promises.push(database.createCollection(type));
          }
        } else if (erase) {
          database.collection(type).truncate();
        }
      });
    }

    return Promise.all(promises).then(() => database);
  }

  /*
   * Convenience wrappers for saving and deleting Spidergram Entities
   */

  async get<T extends Vertice = Vertice>(id: string): Promise<T | undefined> {
    const [collection, key] = id.split('/');
    return this.db.collection<VerticeData>(collection).document(key)
      .then(json => Vertice.fromJSON(json) as T)
      .catch(() => undefined);
  }

  async push(input: Vertice | Vertice[], overwrite = true): Promise<PromiseSettledResult<DocumentMetadata>[]> {
    const promises: Array<Promise<DocumentMetadata>> = [];
    const overwriteMode = (overwrite) ? 'replace' : 'ignore';
    input = arrify(input);

    // To ensure we don't have any premature reference insertions, we
    // save all vertices before saving edges.
    for (const vertice of input) {
      if (!isEdge(vertice)) {
        promises.push(this.db.collection(vertice._collection)
          .save(vertice.toJSON(), {overwriteMode}));
      }
    }

    for (const edge of input) {
      if (isEdge(edge)) {
        promises.push(this.db.collection(edge._collection)
          .save(edge.toJSON(), {overwriteMode}));
      }
    }

    return Promise.allSettled(promises)
  }

  async delete(input: Vertice | Vertice[]) {
    const promises: Array<Promise<DocumentMetadata>> = [];
    input = arrify(input);

    // When bulk deleting, remove edges first.
    for (const edge of input) {
      if (isEdge(edge)) {
        promises.push(this.db.collection(edge._collection).remove(edge.documentId));
      }
    }

    for (const vertice of input) {
      if (!isEdge(vertice)) {
        promises.push(this.db.collection(vertice._collection).remove(vertice.documentId));
      }
    }

    return Promise.all(promises);
  }

  async erase(options: {collections?: string[]; eraseAll?: boolean}) {
    options.collections ??= [];
    const collections = await this.db.listCollections(true);
    for (const collection of collections) {
      if ((options.collections.includes(collection.name)) || (options.collections.length === 0 && options.eraseAll === true)) {
        await this.db.collection(collection.name).truncate();
      }
    }
  }

  // Two quick helpers that eliminate unecessary property traversal
  get query() {
    return this.db.query.bind(this.db);
  }

  get collection() {
    return this.db.collection.bind(this.db);
  }
}
