import test from 'ava';
import { ParsedUrl, UrlTools } from '../../src/index.js';

test('infinite tilde', t => {
  let url = new ParsedUrl('https://example.com/subdirectory/~/~/~');
  t.true(UrlTools.isRepeatingPath(url, 3));

  url = new ParsedUrl('https://example.com/subdirectory/~/~/~/');
  t.true(UrlTools.isRepeatingPath(url, 3));

  url = new ParsedUrl('https://example.com/subdirectory/~/~/interrupted/~/~');
  t.false(UrlTools.isRepeatingPath(url, 3));

  url = new ParsedUrl('https://example.com/subdirectory/~/~/~/test.html');
  t.false(UrlTools.isRepeatingPath(url, 3));
});
