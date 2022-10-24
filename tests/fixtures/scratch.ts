import {log} from 'crawlee';
import {ArangoStore} from '../../source/arango-store.js';
import {PlaywrightSpider} from '../../source/spider/index.js';

const project = 'example';
const storage = await ArangoStore.open(project);
await storage.erase(undefined, true);

const domains = [
  'https://karenmcgrane.com',
  'https://ethanmarcotte.com',
  'https://eaton.fyi',
  'https://autogram.is',
  'https://angrylittletree.com'
];

log.setLevel(log.LEVELS.DEBUG);

const spider = new PlaywrightSpider({
  storage,
  autoscaledPoolOptions: {
    maxConcurrency: 10,
    maxTasksPerMinute: 60,
  },
});
const c = await spider.run(domains);

console.log(c);
