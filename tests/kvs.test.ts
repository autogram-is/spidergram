import test from 'ava';
import { KeyValueStore } from '../src/index.js';

test('create and delete', async t => {
  const k = await KeyValueStore.open();
  await k.empty();
  const info = await k.info();

  t.is(info.name, 'kv_default');
  t.is(info.records, 0);
});

test('push and get', async t => {
  const k = await KeyValueStore.open('test');
  await k.empty();
  const info = await k.info();

  await k.setValue('bob', { name: 'Robert' });
  await k.setValue('fran', { name: 'Francine' });

  t.is(info.name, 'kv_test');

  const bob = await k.getValue('bob');
  const fran = await k.getValue('fran');
  t.deepEqual(bob, { name: 'Robert' });
  t.deepEqual(fran, { name: 'Francine' });

  await k.drop();
});
