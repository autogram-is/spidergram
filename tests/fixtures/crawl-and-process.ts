import {
  Resource,
  Project,
  VerticeWorker,
  Spider,
  aql,
  UrlHierarchy,
} from "../../source/index.js";

import {
  metadata,
  htmlToText,
  readabilityScores,
  cheerio
} from '../../source/analysis/index.js';

const context = await Project.context({ name: 'ethan' });
await context.graph.erase({ eraseAll: true });

const spider = new Spider();
await spider.run(['https://ethanmarcotte.com'])
  .then(results => console.log);

const worker = new VerticeWorker<Resource>({
  collection: 'resources',
  filter: aql`FILTER item.body != null`,
  task: async (resource, context) => {
    const $ = cheerio.load(resource.body!)

    resource.meta = metadata($);
    resource.text = htmlToText(resource.body!, {
      baseElements: {selectors: ['section.page-content', ]},
    });
    resource.readability = readabilityScores(resource.text as string);

    await context.graph.push(resource);
  }
});

const urlHier = new UrlHierarchy(context.graph);
await urlHier.loadPool()
  .then(async () => urlHier.buildRelationships())
  .then(async () => urlHier.save());

console.log(await worker.run());