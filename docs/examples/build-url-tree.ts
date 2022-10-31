import {ArangoStore} from '../../source/model/arango-store.js';
import {UrlHierarchy} from '../../source/analysis/hierarchy/url-hierarchy.js';

const storage = await ArangoStore.open();
const urlHier = new UrlHierarchy(storage);

await urlHier.loadPool()
  .then(async () => urlHier.buildRelationships())
  .then(async () => urlHier.save());

console.log(`Relationships: ${urlHier.data.relationships.length}`);
console.log(`Extrapolated URLs: ${urlHier.data.new.length}`);
console.log(`Orphans: ${urlHier.data.orphans.length}`);
