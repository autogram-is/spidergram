import test from 'ava';
import { readFileSync } from 'fs';
import { HierarchyTools, UniqueUrl, NormalizedUrl } from '../src/index.js';

test('parses hierarchy', t => {
  const buffer = readFileSync('./tests/fixtures/urls/ethanmarcotte.json')
  const urls = JSON.parse(buffer.toString()) as string[];
  
  const options: HierarchyTools.UrlHierarchyBuilderOptions = {
    gaps: 'bridge',
    subdomains: 'children',
  }
  
  const uhb = new HierarchyTools.UrlHierarchyBuilder(options).add(urls);

  t.assert(uhb.findRoots().length === 1);
  t.assert(uhb.items.filter(item => !item.inferred).length === urls.length);
});

test('handles graph objects', t => {
  const uu = new UniqueUrl({ url: 'https://example.com' });
  const uhb = new HierarchyTools.UrlHierarchyBuilder<UniqueUrl>().add([uu]);
  const uhi = [...uhb.items][0];

  t.assert(uhi.data.parsed instanceof NormalizedUrl);
});