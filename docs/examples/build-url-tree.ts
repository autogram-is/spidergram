import {Project, UrlHierarchy} from '../../source/index.js';

const {graph} = await Project.context();
const urlHier = new UrlHierarchy(graph);

await urlHier.loadPool()
  .then(async () => urlHier.buildRelationships())
  .then(async () => urlHier.save());

console.log(`Relationships: ${urlHier.data.relationships.length}`);
console.log(`Extrapolated URLs: ${urlHier.data.new.length}`);
console.log(`Orphans: ${urlHier.data.orphans.length}`);
