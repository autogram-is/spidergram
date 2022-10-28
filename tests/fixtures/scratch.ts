import {log} from 'crawlee';
import {ArangoStore} from '../../source/services/arango-store.js';
import {PlaywrightSpider} from '../../source/spider/index.js';

const project = 'example';
const storage = await ArangoStore.open(project);
await storage.erase(undefined, true);

const seedUrls = [
  'https://angrylittletree.com/atom.xml'
];

log.setLevel(log.LEVELS.INFO);

const spider = new PlaywrightSpider({
  storage,
  autoscaledPoolOptions: {
    maxConcurrency: 10,
    maxTasksPerMinute: 60,
  },
});
const c = await spider.run(seedUrls);

console.log(c);
