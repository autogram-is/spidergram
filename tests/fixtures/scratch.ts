import {log} from 'crawlee';
import {ArangoStore} from '../../source/arango-store.js';
import {PlaywrightSpider} from '../../source/spider/index.js';

const project = 'example';
const storage = await ArangoStore.open(project);
const targetDomain = 'https://example.com';

log.setLevel(log.LEVELS.ERROR);

const spider = new PlaywrightSpider({
  storage: storage,
  failedRequestHandler: (context, error) => {
    log.error(`Failure error: ${error.message}`);
  },
  errorHandler: (inputs, error) => {
    log.error(`Retry error: ${error.message}`);
  },
  autoscaledPoolOptions: {
    maxConcurrency: 10,
    maxTasksPerMinute: 60,
  },
});
const c = await spider.run([targetDomain]);

console.log(c);