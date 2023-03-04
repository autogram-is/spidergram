import test from 'ava';
import { BrowserTools } from '../../src/index.js';

test('fingerprint definitions load', async t => {
  const fp = await new BrowserTools.Fingerprint().loadDefinitions();
  t.assert(fp !== undefined);
});

