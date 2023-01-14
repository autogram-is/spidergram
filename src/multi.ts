import { Project, Resource, HtmlTools } from "./index.js";

const matchedSelectors: HtmlTools.SelectorForResource[] = [
  { test: r => r.parsed?.domain === 'schwab.com', selector: 'region-content > .region-content' },
  { test: r => r.parsed?.domain === 'tdameritrade.com', selector: '.page-main-content' }
]

await getContent();

async function getContent() {
  const c = await Project.config();
  const db = await c.graph();
  const resource = await db.findById<Resource>('resources/ba439a21-ea10-5b2d-b842-6b9cfb9074cf');

  if (resource && resource.body) {
    resource.content = HtmlTools.getPageContent(resource, { matchedSelectors, readability: true })
    await db.push(resource);
  }
}