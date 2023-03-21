import { JsonPrimitive } from "@salesforce/ts-types";
import { AqFilter, isAqlAggregateFunction, isAqlFunction } from "aql-builder";
import arrify from "arrify";

export function buildFilter(input: string): AqFilter {
  let filterSpec: AqFilter;

  if (input.indexOf('!=') >= 0) {
    // property must not equal
    const [prop, value] = input.split('!=');
    const cv = coerceValue(value);
    filterSpec = { ...unwrapPathFunction(prop), negate: true, eq: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else if (input.indexOf('=') >= 0 || input.indexOf('==') >= 0) {
    // property must equal
    const [prop, value] = input.split(/=+/);
    const cv = coerceValue(value);
    filterSpec = { ...unwrapPathFunction(prop), eq: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else if (input.indexOf('>') >= 0) {
    // property must be greater than value
    const [prop, value] = input.split('>');
    const cv = coerceValue(value) ?? undefined;
    filterSpec = { ...unwrapPathFunction(prop), gt: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else if (input.indexOf('<') >= 0) {
    // property must be less than value
    const [prop, value] = input.split('<');
    const cv = coerceValue(value) ?? undefined;
    filterSpec = { ...unwrapPathFunction(prop), lt: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else if (input.indexOf('{') >= 0) {
    // property must be contained in a list of values
    const [prop, value] = input.split('{');
    filterSpec = {
      ...unwrapPathFunction(prop),
      in: arrify(splitMultiValues(value)),
    };
    if (typeof (filterSpec.in ?? [])[0] === 'string')
      filterSpec.type = 'string';
  } else if (input.indexOf('}') >= 0) {
    // value must be contained in property, which is a list
    const [prop, value] = input.split('}');
    const cv = coerceValue(value);
    filterSpec = { ...unwrapPathFunction(prop), contains: cv };
    if (typeof cv === 'string') filterSpec.type = 'string';
  } else {
    // No equality/comparison operator or explicit value. We'll treat
    // it as a 'not null'
    filterSpec = { ...unwrapPathFunction(input), eq: null, negate: true };
  }

  return filterSpec;
}

export function splitMultiValues(value: string) {
  const multiValues: JsonPrimitive[] = value
    .split(',')
    .map(item => item.trim())
    .map(item => coerceValue(item));
  if (multiValues.length === 0) return multiValues[0];
  else return multiValues;
}

export function coerceValue(value: string) {
  const numValue = Number.parseInt(value);
  if (!Number.isNaN(numValue)) return numValue;
  else if (value.toLocaleLowerCase() === 'null') return null;
  else return value;
}

export function unwrapPathFunction(input: string, aggregate = true) {
  const [patternMatch, func, path] =
    input.match(/([a-zA-Z0-0_]+)\((.*)\)/) ?? [];
  if (patternMatch) {
    if (aggregate && isAqlAggregateFunction(func)) {
      return { path, function: func };
    } else if (!aggregate && isAqlFunction(func)) {
      return { path, function: func };
    }
  }

  return { path: input };
}