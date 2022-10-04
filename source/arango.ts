import is from "@sindresorhus/is";
import { Config } from "arangojs/connection.js";
import { Database } from 'arangojs';
import { Vertice, isEdge } from "./model/index.js";
import { DocumentMetadata } from "arangojs/documents.js";
import { DocumentCollection } from "arangojs/collection.js";

export class Arango {
  db: Database;
  systemDb: Database;

  constructor(options: Partial<Config> | string = {}) {
    if (is.string(options)) {
      options = { databaseName: options };
    }
    options.url ??= 'http://127.0.0.1:8529';
    
    this.systemDb = new Database({
      ...options,
      databaseName: undefined
    });
    if (options.databaseName) {
      this.db = this.systemDb.database(options.databaseName)
    } else {
      this.db = this.systemDb;
    }

    this.initialize().catch(reason => { throw reason });
  }

  /* Mutable methods */
  add(input: Vertice | Vertice[]): Promise<DocumentMetadata[]> {
    return this.set(input, false);
  }

  async set(input: Vertice | Vertice[], overWriteExisting: boolean = true): Promise<DocumentMetadata[]> {
    const promises: Promise<DocumentMetadata>[] = [];
    const overwriteMode = (overWriteExisting) ? 'replace' : 'ignore';
    if (!is.array(input)) input = [input];
    for (const vertice of input) {
      if (!isEdge(vertice)) {
        promises.push(this.db.collection(vertice._collection)
          .save(vertice.toJSON(), { overwriteMode: overwriteMode }));
      }
    }
    for (const vertice of input) {
      if (isEdge(vertice)) {
        promises.push(this.db.collection(vertice._collection)
          .save(vertice.toJSON(), { overwriteMode: overwriteMode }));
      }
    }
    return Promise.all(promises);
  }

  async initialize(): Promise<DocumentCollection[]> {
    const promises: Promise<DocumentCollection>[] = [];
    for (let type of Vertice.types.keys()) {
      this.db.collection(type).exists().then(exists => {
        if (!exists) {
          promises.push(this.db.createCollection(type));
        }
      });
    }
    return Promise.all(promises);
  }
}