import { Spidergram } from '../../index.js';
import { QueryOptions } from 'arangojs/database.js';
import {
  GeneratedAqlQuery,
  aql,
  isGeneratedAqlQuery,
  literal,
} from 'arangojs/aql.js';
import { AnyJson } from '@salesforce/ts-types';
import { AqBuilder, AqQuery, isAqQuery } from 'aql-builder';

export class Query extends AqBuilder {
  static async run<T = AnyJson>(
    query: string | GeneratedAqlQuery | AqQuery | Query,
    options: QueryOptions = {},
  ) {
    const sg = await Spidergram.load();
    let aq = aql`RETURN null`;

    // Do we have the key to an existing saved query?
    if (typeof query === 'string') {
      if (sg.config.queries?.[query]) query = sg.config.queries?.[query];
    }

    // Now deal with the query type
    if (typeof query === 'string') {
      aq = aql`${literal(query)}`;
    } else if (isGeneratedAqlQuery(query)) {
      aq = query;
    } else if (isAqQuery(query)) {
      aq = Query.build(query);
    } else if (query instanceof Query) {
      aq = query.build();
    }

    return Spidergram.load()
      .then(sg => sg.arango.db)
      .then(db => db.query<T>(aq, options).then(cursor => cursor.all()));
  }

  async run<T = AnyJson>(options: QueryOptions = {}) {
    return Query.run<T>(this.build(), options);
  }
}
