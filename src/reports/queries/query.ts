import { Project } from '../../index.js';
import { QueryOptions, Database } from 'arangojs/database.js';
import { GeneratedAqlQuery } from 'arangojs/aql.js';
import { AnyJson } from '@salesforce/ts-types';

export { QueryOptions } from 'arangojs/database.js';

export class Query {
  constructor(protected _query: GeneratedAqlQuery) {}

  static db?: Database;

  static async run<T = AnyJson>(
    query: GeneratedAqlQuery,
    options: QueryOptions = {},
  ) {
    if (this.db === undefined) {
      this.db = await Project.config()
        .then(project => project.graph())
        .then(graph => graph.db);
    }
    return this.db.query<T>(query, options).then(cursor => cursor.all());
  }

  get query() {
    return this._query;
  }

  async run<T = AnyJson>(options: QueryOptions = {}) {
    return Query.run<T>(this.query, options);
  }
}
