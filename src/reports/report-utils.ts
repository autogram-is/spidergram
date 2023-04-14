import { isAqAggregate, isAqFilter, isAqProperty, isAqQuery, isAqSort } from "aql-builder";
import { GeneratedAqlQuery, aql, isGeneratedAqlQuery, literal } from "arangojs/aql.js";
import { ReportQuery } from "./report-types.js";
import { AqQueryFragment, QueryInput } from "./report-types.js";
import { Query } from "../model/index.js";
import { Spidergram } from "../config/index.js";

export function isReportQuery(input: unknown): input is ReportQuery {
  return (isAqQueryFragment(input) || isAqQuery(input));
}

export function isAqQueryFragment(input: unknown): input is AqQueryFragment {
  if (input) {
    if (typeof input !== 'object') return false;
    return ('base' in input);
  }
  return false;
}

export function buildAqlQuery(
  base: Query | GeneratedAqlQuery,
  mods?: ReportQuery
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

/**
 * Given the various forms in which we take query definitions, take one and return either
 * a Query or GeneratedAqlQuery instance.
 */
export async function getReportQuery(
  input: QueryInput | ReportQuery,
): Promise<Query | GeneratedAqlQuery | undefined> {
  if (typeof input === 'string') {
    const sg = await Spidergram.load();
    const query = sg.config.queries?.[input];
    if (query) {
      return getReportQuery(query);
    } else {
      return Promise.resolve(aql`${literal(input)}`);
    }
  } else if (isGeneratedAqlQuery(input)) {
    return Promise.resolve(input);
  } else if (isAqQuery(input)) {
    return Promise.resolve(new Query(input));
  } else if (input instanceof Query) {
    return Promise.resolve(input);
  } else if (isReportQuery(input)) {
    return getReportQuery(input.base);
  } else {
    return Promise.resolve(undefined);
  }
}
