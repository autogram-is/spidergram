import { AqQuery, isAqAggregate, isAqFilter, isAqProperty, isAqQuery, isAqSort } from "aql-builder";
import { GeneratedAqlQuery, aql, isGeneratedAqlQuery, literal } from "arangojs/aql.js";
import { Query } from "../index.js";
import { Spidergram } from "../../config/index.js";
import { JsonPrimitive } from "@salesforce/ts-types";

export type AqQueryFragment = Partial<AqQuery>;
export type AqBindVars = Record<string, JsonPrimitive | JsonPrimitive[]>
export type QueryInput = string | AqQuery | Query | GeneratedAqlQuery;

/**
 * A query definition that can (optionally) include a foundational base query.
 * 
 * If the base query is a {@link Query} or an {@link AqQuery}, the properties of
 * the {@link ChildQuery} will be combined with those of the base query to
 * generate a new derivitive query.
 * 
 * If the base query is a {@link GeneratedAqlQuery}, the list of named bind variables
 * will be injected into the base query before execution.
 */
export type ChildQuery = AqQueryFragment & {
  /**
   * The query to use as a starting point. If this value is a string,
   * it will be treated as the name of a saved query to look up in the global
   * configuration. If no query is found, it will be compiled as a raw AQL query.
   * If that fails you're SOL.
   */
  parent: QueryInput;

  /**
   * After a query has been compiled into a {@link GeneratedAqlQuery}, these
   * values will be injected into its list of bound variables.
   */
  bind?: AqBindVars;
};


export function isChildQuery(input: unknown): input is ChildQuery {
  return (isAqQueryFragment(input) || isAqQuery(input));
}

export function isAqQueryFragment(input: unknown): input is AqQueryFragment {
  if (input) {
    if (typeof input !== 'object') return false;
    return ('parent' in input);
  }
  return false;
}

/**
 * Given the various forms in which we take query definitions, take one and return
 * a Query or GeneratedAqlQuery instance.
 */
export async function buildQueryWithParents(
  input: QueryInput | ChildQuery,
): Promise<Query | GeneratedAqlQuery | undefined> {
  if (typeof input === 'string') {
    const sg = await Spidergram.load();
    const query = sg.config.queries?.[input];
    if (query) {
      return buildQueryWithParents(query);
    } else {
      return Promise.resolve(aql`${literal(input)}`);
    }
  } else if (isGeneratedAqlQuery(input)) {
    return Promise.resolve(input);
  } else if (isAqQuery(input)) {
    return Promise.resolve(new Query(input));
  } else if (input instanceof Query) {
    return Promise.resolve(new Query(input.spec));
  } else if (isChildQuery(input)) {
    return buildQueryWithParents(input.parent)
      .then(q => q ? addToParentQuery(q, input) : undefined)
  } else {
    return Promise.resolve(undefined);
  }
}

/**
 * Apply child-query modifications to a parent query.
*/
export function addToParentQuery(
  base: Query | GeneratedAqlQuery,
  mods?: ChildQuery
) {
  let aq: GeneratedAqlQuery | undefined;

  if (base instanceof Query) {
    if (mods) {
      if (mods.subqueries) {
        base.spec.subqueries ??= [];
        base.spec.subqueries.push(...mods.subqueries);
      }
      for (const f of mods.filters ?? []) {
        if (isAqFilter(f)) base.filterBy(f);
        else if (typeof f === 'string') base.filterBy(f);
      }
      for (const a of mods.aggregates ?? []) {
        if (isAqAggregate(a)) base.aggregate(a);
        else if (typeof a === 'string') base.aggregate(a);
      }
      for (const s of mods.sorts ?? []) {
        if (isAqSort(s) || typeof s === 'string') base.return(s);
      }
      for (const r of mods.return ?? []) {
        if (isAqProperty(r) || typeof r === 'string') base.return(r);
      }
      if (mods.comment) base.comment(mods.comment);
      if (mods.limit) base.limit(mods.limit);
    }
    aq = base.build();
  } else {
    aq = base;
  }
  
  if (aq && mods?.bind) {
    for (const [key, val] of Object.entries(mods.bind)) {
      aq.bindVars[key] = val;
    }
  }

  return aq;
}
