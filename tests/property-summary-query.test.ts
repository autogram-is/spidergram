import test from 'ava';
import { Query, getPropertySummary } from "../src/index.js";

test('grouped query runs', async t => {
  const query = getPropertySummary('resources', {
    properties: ['data.head.title'],
    groupBy: ['parsed.domain'],
    includeTotal: true
  });
  const results = await Query.run(query);
  t.assert(results.length > 0);
});
