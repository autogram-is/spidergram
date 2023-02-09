import { Project } from '../../index.js';
import { QueryOptions, Database } from 'arangojs/database.js';
import { GeneratedAqlQuery, isGeneratedAqlQuery } from 'arangojs/aql.js';
import { AnyJson } from '@salesforce/ts-types';
import { Query as QueryBuilder, QuerySpec } from 'aql-builder';
export { QueryOptions } from 'arangojs/database.js';

export class Query extends QueryBuilder {
  static db?: Database;

  static async run<T = AnyJson>(
    query: GeneratedAqlQuery | QuerySpec,
    options: QueryOptions = {},
  ) {
    if (this.db === undefined) {
      this.db = await Project.config()
        .then(project => project.graph())
        .then(graph => graph.db);
    }
    const aql = isGeneratedAqlQuery(query) ? query : QueryBuilder.build(query);
    return this.db.query<T>(aql, options).then(cursor => cursor.all());
  }

  async run<T = AnyJson>(options: QueryOptions = {}) {
    return Query.run<T>(this.build(), options);
  }
}
