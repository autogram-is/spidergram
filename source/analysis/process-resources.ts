import { JsonObject } from '../index.js';
import { Arango, aql } from '../arango.js';
import { Resource } from '../model/index.js';

import { GeneratedAqlQuery } from 'arangojs/aql.js';
import { DocumentMetadata } from 'arangojs/documents.js';

export type ProcessOptions = Record<string, (r: Resource) => unknown>;

export async function processResources(
  storage: Arango,
  filter: GeneratedAqlQuery,
  options: ProcessOptions
) {  
  let results = {
    saved: {} as Record<string, DocumentMetadata>,
    errors: {} as Record<string, Error>
  };
  
  // Pull in all the resources that have body text
  const resources = storage.db.collection<JsonObject>('resources');
  const queryResults = await storage.db.query(aql`
    FOR resource in ${resources}
      ${filter}
      RETURN resource
  `);    

  // Pull the results 
  for await (const r of queryResults) {
    const resource = Resource.fromJSON(r as JsonObject);

    try {
      for (const property in options) {
        resource.set(property, options[property](resource));
      }
      results.saved[resource._key] = (await storage.set(resource))[0];
    } catch (error: unknown) {
      if (error instanceof Error) {
        results.errors[resource._key] = error ;
      }
    }
  }

  return Promise.resolve(results);
}
