import test from 'ava';
import { JsonGraph, where } from '@autogram/autograph';
import { Context, UniqueUrl } from '../source/index.js';

test('save and reload url', async (t) => {
  Context.directory += '/crawl_data';
  Context.ensureSubdirectory();
  const graph = new JsonGraph();
  graph.save(Context.path('uu-test.ndjson'));

  const uu = new UniqueUrl('https://test.com/a/subdirectory');
  graph.add(uu);
  graph.save();

  const g2 = new JsonGraph();
  g2.load(Context.path('uu-test.ndjson'));
  const nodes = g2.nodes(where('type', { eq: 'unique_url' }));

  t.assert(nodes !== undefined);

  console.log(nodes);
});
