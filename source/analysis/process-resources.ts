import { JsonObject } from '../index.js';
import { ArangoStore } from '../arango-store.js';
import { Resource } from '../model/index.js';
import { Database } from 'arangojs/database.js';

import { GeneratedAqlQuery, aql } from 'arangojs/aql.js';
import { DocumentMetadata } from 'arangojs/documents.js';

export type ProcessOptions = Record<string, (r: Resource) => unknown>;

export async function processResources(
  filter: GeneratedAqlQuery,
  options: ProcessOptions,
  database: Database,
) {  
  let results = {
    saved: {} as Record<string, DocumentMetadata>,
    errors: {} as Record<string, Error>
  };

  const workingDb = database ?? ArangoStore.db;
  
  // Pull in all the resources that have body text
  const resources = workingDb.collection<JsonObject>('resources');
  const queryResults = await workingDb.query(aql`
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
      results.saved[resource._key] = (await ArangoStore.set(resource, workingDb))[0];
    } catch (error: unknown) {
      if (error instanceof Error) {
        results.errors[resource._key] = error ;
      }
    }
  }

  return Promise.resolve(results);
}

