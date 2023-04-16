import { ChildQuery, Spidergram, addToParentQuery, buildQueryWithParents, isChildQuery } from '../../index.js';
import { QueryOptions } from 'arangojs/database.js';
import {
  GeneratedAqlQuery,
  aql,
  isGeneratedAqlQuery,
  literal,
} from 'arangojs/aql.js';
import { AnyJson } from '@salesforce/ts-types';
import { AqBuilder, AqQuery, AqStrict, isAqQuery } from 'aql-builder';
import { ArangoCollection } from 'arangojs/collection.js';
import _ from 'lodash';

export class Query extends AqBuilder {
  static async run<T = AnyJson>(
    input: string | GeneratedAqlQuery | AqQuery | Query | ChildQuery,
    options: QueryOptions = {},
  ) {
    const sg = await Spidergram.load();
    let aq = aql`RETURN null`;

    // Do we have the key to an existing saved query?
    if (typeof input === 'string') {
      if (sg.config.queries?.[input]) input = sg.config.queries?.[input];
    }

    if (isChildQuery(input)) {
      const modified = await(buildQueryWithParents(input))
        .then(q => q ? addToParentQuery(q, input as ChildQuery) : undefined);
      if (modified) aq = modified;
    } else if (typeof input === 'string') {
      aq = aql`${literal(input)}`;
    } else if (isGeneratedAqlQuery(input)) {
      aq = input;
    } else if (isAqQuery(input)) {
      aq = Query.build(input);
    } else if (input instanceof Query) {
      aq = input.build();
    }

    return Spidergram.load()
      .then(sg => sg.arango.db)
      .then(db => db.query<T>(aq, options).then(cursor => cursor.all()));
  }

  constructor(input: string | ArangoCollection | AqStrict | AqQuery, document?: string) {
    // This avoids unpleasant situations where a base query spec is modified,
    // each time it's used, affecting all of the other queries based on it.
    if (isAqQuery(input)) {
      super(_.cloneDeep(input), document);
    } else {
      super(input, document);
    }
  }

  async run<T = AnyJson>(options: QueryOptions = {}) {
    return Query.run<T>(this.build(), options);
  }

  category(input?: string): this {
    this.spec.metadata ??= {};
    this.spec.metadata.category = input;
    return this;
  }

  description(input?: string): this {
    this.spec.metadata ??= {};
    this.spec.metadata.description = input;
    return this;
  }
}
