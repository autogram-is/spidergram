import {
  Project,
  Spider,
  HtmlTools,
  TextTools,
} from '../source/index.js';

const context = await Project.context({name: 'ethan'});
await context.graph.erase({eraseAll: true});

const spider = new Spider({
  async pageHandler(context) {
    const {$, saveResource, enqueueLinks} = context;

    const body = $!.html();
    const meta = HtmlTools.getMetadata($!);
    const text = HtmlTools.generatePlainText(body, {
      baseElements: {selectors: ['section.page-content']},
    });
    const readability = TextTools.calculateReadability(text);

    await saveResource({meta, text, readability,});
    await enqueueLinks();
  },
});
await spider.run(['https://ethanmarcotte.com'])
  .then(results => console.log);
