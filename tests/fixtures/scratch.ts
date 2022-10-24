import {log} from 'crawlee';
import {ArangoStore} from '../../source/arango-store.js';
import {PlaywrightSpider} from '../../source/spider/index.js';

const project = 'example';
const storage = await ArangoStore.open(project);
await storage.erase(undefined, true);

const targetDomain = 'https://example.com';

log.setLevel(log.LEVELS.DEBUG);

const spider = new PlaywrightSpider({
  storage,
  autoscaledPoolOptions: {
    maxConcurrency: 10,
    maxTasksPerMinute: 60,
  },
});
const c = await spider.run(targetDomain);

console.log(c);
