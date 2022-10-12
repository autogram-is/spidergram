import { Arango, aql } from '../source/arango-store.js';
import { ProcessOptions, processResources } from '../source/analysis/process-resources.js';

import { getMeta } from '../source/analysis/index.js';
import { htmlToText } from 'html-to-text';
import readability from 'readability-scores';

// Load the Example database
const a = new Arango();
await a.load('example');

// Set up a simple filter
const filter = aql`FILTER resource.body != null`;

// Create a handful of processors mapping Resource properties
// to functions that should populate them
const options:ProcessOptions = {
  metadata: resource => (resource.body) ? getMeta(resource.body) : undefined,
  text: resource => (resource.body) ? htmlToText(resource.body) : undefined,
  readability: resource => (resource.text) ? readability(resource.text as string) : undefined,
}

const results = await processResources(a, filter, options);
console.log(results);
