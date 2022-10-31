import { PlaywrightSpider } from '../../source/spider/index.js';

const spider = new PlaywrightSpider({
  projectConfig: { name: 'spidergram' },
  requestHandlers: {
    page: async (context) => {
      console.log(context);
    }
  }
});

const results = await spider.run(['https://example.com']);

console.log(results);