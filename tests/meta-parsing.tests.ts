import test from 'ava';
import { readFile } from 'fs/promises';
import { getPageData } from '../src/tools/html/index.js';

test('file parses', async t => {
  const markup = await readFile('./test/fixtures/schwab.html')
    .then(buffer => buffer.toString());
  const results = getPageData(markup);
  t.assert(results);
});