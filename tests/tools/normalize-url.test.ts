import { ParsedUrl, globalNormalizer, NormalizerOptions } from "../../src/index.js";
import { readFileSync } from "fs";
import test from 'ava';

const buffer = readFileSync('../fixtures/urls/example.json');
const urls = JSON.parse(buffer.toString()) as string[];

test('replace directory', t => {
  const options: NormalizerOptions = {
    replace: { match: '/news/', value: '/latest/' }
  };

  const pUrls = urls.map(u => new ParsedUrl(u));
  const nUrls = pUrls.map(p => globalNormalizer(p, options));

  console.log(nUrls.map(u => u.href));
  t.is(nUrls.length, pUrls.length);
});

test('rename query', t => {
  const options: NormalizerOptions = {
    replace: { match: 'page=', value: 'p=' }
  };

  const pUrls = urls.map(u => new ParsedUrl(u));
  const nUrls = pUrls.map(p => globalNormalizer(p, options));

  console.log(nUrls.map(u => u.href));
  t.is(nUrls.length, pUrls.length);
});

test('alter domain', t => {
  const options: NormalizerOptions = {
    replace: { match: '://example.com/', value: '://another-example.com/', all: true }
  };

  const pUrls = urls.map(u => new ParsedUrl(u));
  const nUrls = pUrls.map(p => globalNormalizer(p, options));

  console.log(nUrls.map(u => u.href));
  t.is(nUrls.length, pUrls.length);
});
