import test from 'ava';
import { readFileSync } from 'fs';
import { HierarchyTools } from '../src/index.js';

test('example hierarchy parsed', t => {
  const buffer = readFileSync('./tests/fixtures/urls/example.json')
  const urls = JSON.parse(buffer.toString()) as string[];
  
  const uhb = new HierarchyTools.UrlHierarchyBuilder({urls});

  uhb.populateRelationships();
  const roots = uhb.getRoots();
  t.assert(roots.length === 2);

  const primaryRoot = roots.pop();
  t.assert(primaryRoot?.countDescendents() === 11);

  const orphans = uhb.getOrphans();
  t.assert(orphans.length === 1);
});
