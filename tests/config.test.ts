import test from 'ava';
import path from 'path';
import { Spidergram } from '../src/index.js';

const testConfig = path.resolve(process.cwd(), './tests/fixtures/config/minimal.json');

test('config loads', async t => {
  // We haven't loaded any configuration data yet, this flag should be undefined.
  t.is(Spidergram.config.testing, undefined);

  // Now, we load it and ensure the custom flag is there.
	await t.notThrowsAsync(Spidergram.load(testConfig));
  t.is(Spidergram.config.testing, true);

  // Now, we load it and ensure the custom flag is there.
	await t.notThrowsAsync(Spidergram.load());
  t.is(Spidergram.config.testing, true);

  // Make sure the database actually exists, and has our collections.
  const sg = await Spidergram.load();
  t.assert(sg.arango !== undefined);
  t.assert(await sg.arango.collection('resources').exists());
});
