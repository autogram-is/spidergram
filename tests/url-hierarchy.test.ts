import test from 'ava';
import { readFileSync } from 'fs';
import { HierarchyTools } from '../src/index.js';

test('example hierarchy parsed', t => {
  const buffer = readFileSync('./tests/fixtures/urls/ethanmarcotte.json')
  const urls = JSON.parse(buffer.toString()) as string[];
  
  const options: HierarchyTools.UrlHierarchyBuilderOptions = {
    gaps: 'adopt',
    subdomains: 'children',
  }
  
  const uhb = new HierarchyTools.UrlHierarchyBuilder(options).add(urls);

  t.assert(uhb.findRoots().length === 1);
  
  const root = uhb.findLargestRoot();
  t.assert(root !== undefined);
  t.assert(uhb.items.filter(item => item.gap !== 'filled').length === urls.length);
});
