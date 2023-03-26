import {
  JsonCollection,
  JsonMap,
  asJsonArray,
  isJsonArray,
  isJsonMap,
} from '@salesforce/ts-types';

// This is the ugliest, nastiest set of Schema.Org JSON+LD mangling functions ever.
// We should deal with it later; sadly there are VERY few libraries that actually
// deal with parsing Schema.org data, and fewer still that do so efficiently.

type AnySchemaOrg = JsonMap & {
  '@context'?: string;
} & ({ '@graph': JsonMap[] } | { '@type': string });

export function isSchemaOrg(input: JsonCollection): input is AnySchemaOrg {
  if (
    isJsonMap(input) &&
    '@context' in input &&
    typeof input['@context'] === 'string' &&
    input['@context'].includes('schema.org')
  ) {
    return true;
  }
  return false;
}

// This is easily the most naive
export function getSchemaOrgData(input: AnySchemaOrg): JsonMap {
  let resultList: JsonMap[] = [];
  if ('@graph' in input) {
    resultList = ((input['@graph'] as JsonMap[]) || undefined) ?? [];
  } else {
    delete input['@context'];
    resultList = [input];
  }

  const results: JsonMap = {};
  for (const item of resultList) {
    const { '@type': key, ...values } = item;
    if (typeof key === 'string') {
      if (results[key]) {
        if (isJsonArray(results[key])) {
          asJsonArray(results[key])?.push(values);
        } else {
          results[key] = [values, results[key] ?? {}];
        }
      } else {
        results[key] = values;
      }
    }
  }
  return results;
}
