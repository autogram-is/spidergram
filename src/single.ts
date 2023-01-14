import { Project, GraphWorker, Resource, HtmlTools, aql } from "./index.js";
const config = await Project.config();
const db = await config.graph();

const matchedSelectors: HtmlTools.SelectorForResource[] = [
  { test: r => r.parsed?.domain === 'schwab.com', selector: 'region-content > .region-content' },
  { test: r => r.parsed?.domain === 'tdameritrade.com', selector: '.page-main-content' }
]

await getContent();

async function getContent() {
  await new GraphWorker<Resource>({
    collection: 'resources',
    filter: aql`FILTER item.code == 200 && item.mime == 'text/html'`,
    task: async resource => {
      if (resource.body) {
        resource.content = HtmlTools.getPageContent(resource, { matchedSelectors, readability: true, defaultToFullDocument: false })
      }
      console.log(resource.url);
      await db.push(resource);
    }
  }).run();
  console.log('Done!');
}