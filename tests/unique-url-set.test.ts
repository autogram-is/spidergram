import test from 'ava';
import { UniqueUrlSet } from '../src/index.js';
import { testUrls } from './fixtures/urls.js';

test('handles missing procotols', t => {
  const noProtocol = new UniqueUrlSet(testUrls.noProtocol);
  const assumeProtocol = new UniqueUrlSet(testUrls.noProtocol, { guessProtocol: true });

  t.assert(noProtocol.entries.length == 0);
  t.assert(assumeProtocol.entries.length == 0);
});