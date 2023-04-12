import test from 'ava';
import { globalNormalizer } from '../../src/index.js';
import { ParsedUrl, Spidergram } from '../../src/index.js';
import is from '@sindresorhus/is';

await Spidergram.load();

test('normalizer defaults', t => {
  const rules = Spidergram.defaults.normalizer;
  const input = new ParsedUrl('http://username:password@www.subdomain.Example.com/path/index.html?utm_src=1&page=1&p=2#anchor');
  // Our default rules should turn this into `https://subdomain.example.com/path/?p=2&page=1`

  const normalized = is.function_(rules) ?
    rules(input) : 
    globalNormalizer(input, rules);

  t.is(normalized.protocol, 'https:');
  t.is(normalized.username, '');
  t.is(normalized.password, '');
  t.is(normalized.hostname, 'subdomain.example.com');
  t.is(normalized.port, '');
  t.is(normalized.pathname, '/path');
  t.is(normalized.search, '?p=2&page=1');
  t.is(normalized.hash, '');
});
