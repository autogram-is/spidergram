import test from 'ava';
import { Query } from "../../src/index.js";

test('grouped query runs', async t => {
  const results = await new Query('resources')
    .groupBy('parsed.domain')
    .return('data.head.title')
    .run();
  t.assert(results.length > 0);
});
