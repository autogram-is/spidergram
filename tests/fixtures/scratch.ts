import { ArangoStore } from '../../source/arango-store.js';
import { UrlHierarchy } from '../../source/analysis/hierarchy/url-hierarchy.js';
//import { aql } from 'arangojs/aql.js';

const storage = await ArangoStore.open('karenmcgrane_com');
await storage.collection('is_child_of').truncate();


// const query = aql`FILTER uu.parsed.domain == 'karenmcgrane.com'`;
const urlHier = new UrlHierarchy(storage);
await urlHier.loadPool()
  .then(() => urlHier.buildRelationships());

console.log(`Relationships: ${urlHier.data.relationships.length}`);
console.log(`Extrapolated URLs: ${urlHier.data.new.length}`);
console.log(`Orphans: ${urlHier.data.orphans.length}`);

await urlHier.save();