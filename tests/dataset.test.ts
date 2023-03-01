import test from 'ava';
import { Dataset } from '../src/index.js';

test('create and delete', async t => {
  const d = await Dataset.open();
  await d.empty();
  const info = await d.info();

  t.is(info.name, 'ds_default');
  t.is(info.records, 0);
});

test('push and get', async t => {
  const d = await Dataset.open('test');
  await d.empty();
  const info = await d.info();

  await d.pushData([
    { name: 'bob' },
    { name: 'francine' },
  ])

  t.is(info.name, 'ds_test');

  const data = await d.getData();
  t.is(data.count, 2);
  await d.drop();
});
