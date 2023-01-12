import test from 'ava';
import { readFile } from 'fs/promises';
import { getMetadata } from '../src/tools/html/index.js';

test('file parses', async t => {
  const markup = await readFile('./test/fixtures/schwab.html')
    .then(buffer => buffer.toString());
  const results = getMetadata(markup);
  t.assert(results);
});