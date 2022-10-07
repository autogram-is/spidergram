import { aql } from 'arangojs';
import { JsonObject } from '../source/index.js';
import { Arango } from '../source/arango.js';
import { Resource } from '../source/model/index.js';
import { getMeta } from '../source/index.js';

import { htmlToText } from 'html-to-text';
import readability from 'readability-scores';

const a = new Arango();
await a.load('example');
const resourceCollection = a.db.collection<JsonObject>('resources');
const resources: Resource[] = [];

async function process() {
  try {
    const raw = await a.db.query(aql`
      FOR r in ${resourceCollection}
        FILTER r.body != null
        RETURN r
    `);
    
    for await (const r of raw) {
      const resource = Resource.fromJSON(r as JsonObject);
      if (resource.body !== undefined) {
        // Extract page metadata, strip markup from the body html,
        // and calculate its readability score.

        resource.metadata ??= getMeta(resource.body);
        resource.text ??= htmlToText(resource.body);
        
        resource.readability ??= readability(resource.text as string);

        // Add it to the queue of resources to save.
        resources.push(resource);
      }
    }

    return a.set(resources);

  } catch (error: unknown) {
    console.error(error);
    return Promise.resolve([]);
  }
}

console.log(await process());