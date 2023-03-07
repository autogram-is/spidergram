import { Spidergram } from '../../index.js';
import { QueryOptions, Database } from 'arangojs/database.js';
import { GeneratedAqlQuery, isGeneratedAqlQuery } from 'arangojs/aql.js';
import { AnyJson } from '@salesforce/ts-types';
import { AqBuilder, AqQuery } from 'aql-builder';

export { QueryOptions } from 'arangojs/database.js';

export class Query extends AqBuilder {
  static db?: Database;

  static async run<T = AnyJson>(
    query: GeneratedAqlQuery | AqQuery,
    options: QueryOptions = {},
  ) {
    if (this.db === undefined) {
      this.db = (await Spidergram.init()).arango.db;
    }
    const aql = isGeneratedAqlQuery(query) ? query : AqBuilder.build(query);
    return this.db.query<T>(aql, options).then(cursor => cursor.all());
  }

  async run<T = AnyJson>(options: QueryOptions = {}) {
    return Query.run<T>(this.build(), options);
  }
}
