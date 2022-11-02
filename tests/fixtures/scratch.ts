import {
  Project,
  Spider,
} from "../../source/index.js";

import {
  metadata,
  htmlToText,
  readabilityScores,
} from '../../source/analysis/index.js';

const context = await Project.context({ name: 'ethan' });
await context.graph.erase({ eraseAll: true });

const spider = new Spider({
  pageHandler: async context => {
    const { $, saveResource, enqueueLinks } = context;

    const body = $!.html();
    const meta = metadata($!);
    const text = htmlToText(body, {
      baseElements: {selectors: ['section.page-content', ]},
    });
    const readability = readabilityScores(text);

    await saveResource({
      meta: meta,
      text: text,
      readability: readability,
    });

    await enqueueLinks();
  },
});
await spider.run(['https://ethanmarcotte.com'])
  .then(results => console.log);