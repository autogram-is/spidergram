import test from 'ava';
import { readFileSync } from 'fs';
import { HierarchyTools } from '../src/index.js';

test('example hierarchy parsed', t => {
  const buffer = readFileSync('./tests/fixtures/urls/example.json')
  const urls = JSON.parse(buffer.toString()) as string[];
  
  const uhb = new HierarchyTools.UrlHierarchyBuilder({ subdomains: 'children' });
  uhb.add(urls);
  t.assert(uhb.items.length === urls.length);
});
