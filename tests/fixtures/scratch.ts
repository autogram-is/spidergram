import {Resource, Project, Worker, PlaywrightSpider } from "../../source/index.js";

const context = await Project.context({ name: 'angrylittletree' });
await context.graph.erase({ eraseAll: true });

await new PlaywrightSpider()
  .run(['https://angrylittletree.com'])
  .then(results => console.log);

const worker = new Worker<Resource>({
  collection: 'resources',
  task: async (resource, context) => {
    resource.processed = false;
    await context.graph.push(resource);
  }
});

console.log(await worker.run());