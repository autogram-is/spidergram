import {Project, UrlHierarchyBuilder} from '../index.js';

const {graph} = await Project.config();
const uhb = new UrlHierarchyBuilder(graph);

await uhb.loadPool()
  .then(async () => uhb.buildRelationships())
  .then(async () => uhb.save());

console.log(`Relationships: ${uhb.data.relationships.length}`);
console.log(`Extrapolated URLs: ${uhb.data.new.length}`);
console.log(`Orphans: ${uhb.data.orphans.length}`);
