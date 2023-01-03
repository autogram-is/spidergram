import { GeneratedAqlQuery, aql } from "arangojs/aql";
import { Database } from "arangojs";
import { JsonMap } from "@salesforce/ts-types";
import arrify from "arrify";
import { Project, Vertice } from '../../index.js';

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

/**
 * Constructor options for a basic VerticeQuery; given a collection name
 * and optional filter values, it will find matching records and return
 * fully instantiated Spidergram entities.
 * 
 * NOTE: For some entities (particularly Resources, which hold onto large
 * amounts of text) this can be resource-intensive. Large resultsets can
 * be handled in chunks using the LIMIT and OFFSET options.
 *
 * @export
 * @interface VerticeQueryOptions
 * @typedef {VerticeQueryOptions}
 * @extends {Record<string, unknown>}
 */
export interface VerticeQueryOptions extends Record<string, unknown> {
  /**
   * The name of the Arango document or edge collection to query.
   */
  collection?: string,

  /**
   * The max number of records to return. Only positive numbers will
   * be treated as limits; all others will be treated as 'infinite'.
   *
   * @default 0
   */
  limit?: number,
  
  /**
   * The number of records to ignore when building the result set.
   * Can be used with the `limit` option to page through a large
   * result set.
   *
   * @default 0
   */
  offset?: number,
  
  /**
   * One or more document keys to use as a query filter. 
   */
  keys?: string | string[],
  
  /**
   * One or more document ids to use as a query filter. 
   */
  ids?: string | string[],
  
  /**
   * A fully-constructed AQL filter clause; if necessary, this clause can
   * also include other collections.
   * 
   * NOTE: The current item of the query's 'core' collection will always
   * be named `item`, and will be returned directly from the collection.
   * If your query needs to construct a custom return document, consider
   * the Query class instead of this one.
   * 
   * @example
   * const options = {
   *   aqlFilter = aql`FILTER item.someProperty IN [0, 1, 2]`
   * }
   */
  aqlFilter?: GeneratedAqlQuery
}

/**
 * A helper class that takes in a set of filter options and returns
 * fully instantiated Spidergram entities.
 *
 * @export
 * @class VerticeQuery
 * @typedef {VerticeQuery}
 * @template I extends VerticeQueryOptions = VerticeQueryOptions
 */
export class VerticeQuery<V extends Vertice = Vertice, O extends VerticeQueryOptions = VerticeQueryOptions> {
  count?: number;
  db?: Database;

  constructor(protected options: WithRequired<O, 'collection'>) { }

  get offset(): number {
    return this.options.offset ?? 0;
  }

  set offset(input: number) {
    this.options.offset = input;
  }
  
  get query() {
    let limit: GeneratedAqlQuery | undefined;
    
    if (this.options.limit && this.options.limit > 0) {
      if (this.options.offset && this.options.offset > 0) {
        limit = aql`LIMIT ${this.options.offset}, ${this.options.limit}`
      } else {
        limit = aql`LIMIT ${this.options.limit}`
      }
    }

    const keys = this.options.keys ? aql`FILTER item._key IN ${arrify(this.options.keys)}` : undefined;
    const ids = this.options.ids ? aql`FILTER item._id IN ${arrify(this.options.ids)}` : undefined;

    return aql`
      FOR item IN ${this.options.collection}
      ${ids}
      ${keys}
      ${this.options.aqlFilter}
      ${limit}
      RETURN item
    `;
  }
  
  /**
   * Returns the results of the query as fully instantiated Spidergram entities.
   *
   * @async
   */
  async run(): Promise<V[]> {
    if (this.db === undefined) {
      this.db = await Project.config()
        .then(project => project.graph())
        .then(graph => graph.db);
    }

    return this.db.query<JsonMap>(this.query, { fullCount: true })
      .then(cursor => {
        this.count = cursor.count;
        return cursor.all();
      })
      .then(json => json.map(record => Vertice.fromJSON(record) as V))
  }
}