import test from 'ava';
import { Project } from '../src/index.js';

test('project config loads', async t => {
	const p = await Project.config({ _configFilePath: 'spidegram.example.json' });
  t.is(p.name, 'spidergram');
  t.is(p.configuration._configFilePath, 'spidegram.example.json');
  await t.notThrowsAsync(p.graph())
});

