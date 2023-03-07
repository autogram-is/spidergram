import test from 'ava';
import { readFile } from 'fs/promises';
import { getPageData } from '../../src/tools/html/index.js';

test('handles malformed head', async t => {
  const markup = await readFile('./tests/fixtures/markup/truncated.html')
    .then(buffer => buffer.toString());
  const results = await getPageData(markup);
  t.assert(Object.entries(results.meta ?? {}).length === 15);
});

test('parse options respected', async t => {
  const markup = await readFile('./tests/fixtures/markup/truncated.html')
  .then(buffer => buffer.toString());

  const results = await getPageData(markup, { all: true });
  t.assert(Object.entries(results.meta ?? {}).length === 15);
});