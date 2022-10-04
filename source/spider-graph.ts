import is from "@sindresorhus/is";
import { Config } from "arangojs/connection.js";
import { Database } from 'arangojs';
import { Vertice, isEdge, Reference } from "./model/index.js";

export class SpiderGraph {
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
  add(input: Vertice | Vertice[]): SpiderGraph {
    return this.set(input, false);
  }

  set(input: Vertice | Vertice[], overWriteExisting: boolean = true): SpiderGraph {
    const overwriteMode = (overWriteExisting) ? 'replace' : 'ignore';
    if (!is.array(input)) input = [input];
    for (const vertice of input) {
      if (!isEdge(vertice)) {
        this.db.collection(vertice._collection)
          .save(vertice.toJSON(), { overwriteMode: overwriteMode });
      }
    }
    for (const vertice of input) {
      if (isEdge(vertice)) {
        this.db.collection(vertice._collection)
          .save(vertice.toJSON(), { overwriteMode: overwriteMode });
      }
    }
    return this;
  }

  remove(input: Reference | Reference[], cascade?: true): SpiderGraph {
    console.log('Not supported; use db.remove() directly');
    return this;
  }

  async initialize(): Promise<void> {
    for (let type in Vertice.types) {
      if (await this.db.collection(type).exists()) {
        await this.db.createCollection(type);
      }
    }
  }
}