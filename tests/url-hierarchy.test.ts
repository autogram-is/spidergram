import test from 'ava';
import { readFile } from 'fs/promises';
import { HierarchyTools } from '../src/index.js';

test('example hierarchy parsed', async t => {
  const urls = await readFile('./tests/fixtures/urls/example.json')
    .then(buffer => buffer.toString())
    .then(str =>  JSON.parse(str) as string[]);

  const uhb = new HierarchyTools.UrlHierarchyBuilder(urls);

  uhb.populateRelationships();
  const roots = uhb.getRoots();
  t.assert(roots.length === 2);

  const primaryRoot = roots.pop();
  t.assert(primaryRoot?.countDescendents() === 11);

  const orphans = uhb.getOrphans();
  t.assert(orphans.length === 1);
});
