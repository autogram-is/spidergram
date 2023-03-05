import { assert } from 'node:console';
import is from '@sindresorhus/is';
import { Config } from 'arangojs/connection.js';
import { aql, Database } from 'arangojs';
import { DocumentMetadata } from 'arangojs/documents.js';
import { DocumentCollection } from 'arangojs/collection.js';
import arrify from 'arrify';
import {
  Entity,
  Reference,
  isRelationship,
  UniqueUrl,
  RespondsWith,
  Resource,
  LinksTo,
  IsChildOf,
  IsVariantOf,
  AppearsOn,
  Fragment,
} from '../model/index.js';
import { Project } from './project.js';
import { JsonMap, JsonPrimitive } from '@salesforce/ts-types';
import { join, AqlQuery, literal } from 'arangojs/aql.js';

export const INVALID_KEY_CHARS_REGEX = /[^a-zA-Z0-9_:.@()+,=;$!*'%-]/g;
export const INVALID_COLLECTION_CHARS_REGEX = /[^a-zA-Z0-9_-]/g;
export const INVALID_COLLECTION_FIRST_CHAR_REGEX = /[^a-zA-Z]/g;
export const NAME_SEPARATOR = '_';

export { aql } from 'arangojs';

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
  static async open(
    name?: string,
    customConnection: Partial<Config> = {},
  ): Promise<ArangoStore> {
    const project = await Project.config();
    const { databaseName, ...connection } =
      project.configuration.graph.connection;

    const dbName = name ?? databaseName ?? 'spidergram';
    const dbConn = customConnection ?? connection;

    if (is.undefined(ArangoStore._systemDb)) {
      ArangoStore.connect(dbConn);
      await this.system.databases().catch((error: unknown) => {
        if (is.error(error)) throw error;
        throw new Error('Could not connect to Arango');
      });
    }

    if (is.undefined(ArangoStore.instances[dbName])) {
      ArangoStore.instances[dbName] = new ArangoStore(
        await ArangoStore.load(dbName),
      );
    }

    return ArangoStore.instances[dbName];
  }

  /**
   * Load an Arango database and (if necessary) initialize it with collections
   * for all Spidergram entities. Requires an existing connection to Arango.
   *
   * @param databaseName
   * @returns
   */
  protected static async load(name: string): Promise<Database> {
    const { system } = ArangoStore;

    name = name.replaceAll(INVALID_COLLECTION_CHARS_REGEX, '-');
    if (is.emptyStringOrWhitespace(name)) {
      throw new Error(`Invalid database '${name}'`);
    }

    return ArangoStore.system
      .listDatabases()
      .then(databases =>
        databases.includes(name)
          ? system.database(name)
          : system.createDatabase(name),
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

  static async initialize(
    database: Database,
    erase = false,
  ): Promise<Database> {
    // Ugly shim to ensure all of our entity types are present before initializing.
    const includedTypes = [
      UniqueUrl,
      RespondsWith,
      Resource,
      LinksTo,
      IsChildOf,
      IsVariantOf,
      AppearsOn,
      Fragment,
    ];
    assert(includedTypes.length > 0);

    const promises: Array<Promise<DocumentCollection>> = [];
    for (const type of Entity.types.keys()) {
      await database
        .collection(type)
        .exists()
        .then(exists => {
          if (!exists) {
            if (Entity.types.get(type)?.isRelationship) {
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

  async exists(ref: Reference): Promise<boolean> {
    const [collection, key] = Entity.idFromReference(ref).split('/');
    return this.db.collection(collection).documentExists(key);
  }

  async findById<T extends Entity = Entity>(
    ref: Reference,
  ): Promise<T | undefined> {
    const [collection, key] = Entity.idFromReference(ref).split('/');
    return this.db
      .collection<JsonMap>(collection)
      .document(key)
      .then(json => Entity.fromJSON(json) as T)
      .catch(() => undefined);
  }

  async findAll<T extends Entity = Entity>(
    collection: string,
    criteria: Record<string, JsonPrimitive> = {},
    limit?: number,
  ) {
    const col = this.db.collection(collection);
    const clauses: AqlQuery[] = [];
    for (const prop in criteria) {
      // The literal is a terrible idea, and we should be ashamed of ourselves. Very soon,
      // we'll want to throw together a light query builder. In the meantime, we do this.
      clauses.push(aql`FILTER ${literal('item.' + prop)} == ${criteria[prop]}`);
    }
    if (limit) clauses.push(aql`LIMIT ${limit}`);
    const query = aql`FOR item IN ${col} ${join(clauses)} return item`;

    return this.db
      .query<JsonMap>(query)
      .then(async cursor => cursor.all())
      .then(results => results.map(value => Entity.fromJSON(value) as T));
  }

  async push(
    input: Entity | Entity[],
    overwrite = true,
  ): Promise<PromiseSettledResult<DocumentMetadata>[]> {
    const promises: Array<Promise<DocumentMetadata>> = [];
    const overwriteMode = overwrite ? 'replace' : 'ignore';
    input = arrify(input);

    // To ensure we don't have any premature reference insertions, we
    // save all entities before saving relationships.
    for (const entity of input) {
      if (!isRelationship(entity)) {
        promises.push(
          this.db
            .collection(entity._collection)
            .save(entity.toJSON(), { overwriteMode }),
        );
      }
    }

    for (const relationship of input) {
      if (isRelationship(relationship)) {
        promises.push(
          this.db
            .collection(relationship._collection)
            .save(relationship.toJSON(), { overwriteMode }),
        );
      }
    }

    return Promise.allSettled(promises);
  }

  async delete(input: Entity | Entity[]) {
    const promises: Array<Promise<DocumentMetadata>> = [];
    input = arrify(input);

    // When bulk deleting, remove relationships first.
    for (const relationship of input) {
      if (isRelationship(relationship)) {
        promises.push(
          this.db
            .collection(relationship._collection)
            .remove(relationship.documentId),
        );
      }
    }

    for (const entity of input) {
      if (!isRelationship(entity)) {
        promises.push(
          this.db.collection(entity._collection).remove(entity.documentId),
        );
      }
    }

    return Promise.all(promises);
  }

  async erase(options: { collections?: string[]; eraseAll?: boolean }) {
    options.collections ??= [];
    const collections = await this.db.listCollections(true);
    for (const collection of collections) {
      if (
        options.collections.includes(collection.name) ||
        (options.collections.length === 0 && options.eraseAll === true)
      ) {
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

export function sanitizeDbName(input: string): string {
  return input
    .replaceAll(INVALID_COLLECTION_CHARS_REGEX, '-')
    .replaceAll(/-+/g, NAME_SEPARATOR);
}

export function sanitizeCollectionName(input: string): string {
  return input
    .replaceAll(INVALID_COLLECTION_CHARS_REGEX, '-')
    .replaceAll(/-+/g, NAME_SEPARATOR);
}

export function sanitizeKey(input: string): string {
  return input
    .replaceAll(INVALID_KEY_CHARS_REGEX, '-')
    .replaceAll(/-+/g, NAME_SEPARATOR);
}

export function isValidKey(key: unknown): key is string {
  if (typeof key === 'string') {
    if (key.length < 1) return false;
    if (key.length > 254) return false;
    if (key.match(INVALID_KEY_CHARS_REGEX)) return false;
    return true;
  }
  return false;
}

export function isValidName(name: unknown): name is string {
  if (typeof name === 'string') {
    if (name.length < 1) return false;
    if (name.length > 255) return false;
    if (name[0].match(INVALID_COLLECTION_FIRST_CHAR_REGEX)) return false;
    if (name.match(INVALID_COLLECTION_CHARS_REGEX)) return false;
    return true;
  }
  return false;
}
