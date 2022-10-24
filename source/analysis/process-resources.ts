import * as cheerio from 'cheerio';

import {GeneratedAqlQuery, aql} from 'arangojs/aql.js';
import {DocumentMetadata} from 'arangojs/documents.js';
import is from '@sindresorhus/is';
import {JsonObject} from 'type-fest';
import {Resource} from '../model/index.js';
import {ArangoStore} from '../arango-store.js';

export type ProcessOptions = Record<string, (r: Resource, root?: cheerio.Root) => unknown>;

export async function processResources(
  filter: GeneratedAqlQuery,
  options: ProcessOptions,
  storage: ArangoStore,
) {
  const results = {
    saved: {} as Record<string, DocumentMetadata>,
    errors: {} as Record<string, Error>,
  };

  // Pull in all the resources that have body text
  const resources = storage.collection<JsonObject>('resources');
  const queryResults = await storage.query<JsonObject>(aql`
    FOR resource in ${resources}
      ${filter}
      RETURN resource
  `);

  // Pull the results
  for await (const r of queryResults) {
    const resource = Resource.fromJSON(r);
    const root = (is.nonEmptyStringAndNotWhitespace(resource.body)) ? cheerio.load(resource.body) : undefined;

    try {
      for (const property in options) {
        resource.set(property, options[property](resource, root));
      }

      results.saved[resource._key] = (await storage.push(resource))[0];
    } catch (error: unknown) {
      if (error instanceof Error) {
        results.errors[resource._key] = error;
      }
    }
  }

  return results;
}

