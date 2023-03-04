import test from 'ava';
import { readFileSync } from 'fs';
import { UniqueUrlSet } from '../../src/index.js';

test('handles missing procotols', t => {
  const buffer = readFileSync('./tests/fixtures/urls/mixed-urls.json')
  const urls = JSON.parse(buffer.toString()) as Record<string, string | string[]>;

  const noProtocol = new UniqueUrlSet(urls.noProtocol);
  const assumeProtocol = new UniqueUrlSet(urls.noProtocol, { guessProtocol: true });

  t.assert(noProtocol.entries.length == 0);
  t.assert(assumeProtocol.entries.length == 0);
});