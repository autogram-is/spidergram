import { Spidergram } from '../../index.js';
import { QueryOptions } from 'arangojs/database.js';
import { GeneratedAqlQuery, isGeneratedAqlQuery } from 'arangojs/aql.js';
import { AnyJson } from '@salesforce/ts-types';
import { AqBuilder, AqQuery } from 'aql-builder';

export { QueryOptions } from 'arangojs/database.js';

export class Query extends AqBuilder {
  static async run<T = AnyJson>(
    query: GeneratedAqlQuery | AqQuery,
    options: QueryOptions = {},
  ) {
    const aql = isGeneratedAqlQuery(query) ? query : AqBuilder.build(query);
    return Spidergram.load()
      .then(sg => sg.arango.db)
      .then(db => db.query<T>(aql, options)
      .then(cursor => cursor.all()))
  }

  async run<T = AnyJson>(options: QueryOptions = {}) {
    return Query.run<T>(this.build(), options);
  }
}
