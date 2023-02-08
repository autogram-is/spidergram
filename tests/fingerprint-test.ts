import test from 'ava';
import { BrowserTools } from '../src/index.js';

test('fingerprint definitions load', async t => {
  await t.notThrowsAsync(BrowserTools.Fingerprint.loadDefinitions());
});

