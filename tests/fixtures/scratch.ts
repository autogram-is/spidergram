import {
  Project,
  Spider,
} from '../../source/index.js';

import {
  extractMetadata,
  htmlToText,
  readabilityScores,
} from '../../source/index.js';

const context = await Project.context({name: 'ethan'});
await context.graph.erase({eraseAll: true});

const spider = new Spider({
  async pageHandler(context) {
    const {$, saveResource, enqueueLinks} = context;

    const body = $!.html();
    const meta = extractMetadata($!);
    const text = htmlToText(body, {
      baseElements: {selectors: ['section.page-content']},
    });
    const readability = readabilityScores(text);

    await saveResource({
      meta,
      text,
      readability,
    });

    await enqueueLinks();
  },
});
await spider.run(['https://ethanmarcotte.com'])
  .then(results => console.log);
