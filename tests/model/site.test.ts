import test from 'ava';
import { Site } from '../../src/index.js';

test('basic serialization', t => {
  const s1 = new Site({ key: 'key', name: 'Name' });
  const s1s = Site.fromJSON(s1.toJSON());
  t.deepEqual(s1, s1s);
  t.is(s1.key, 'key');
  t.is(s1.name, 'Name');
});

test('name only', t => {
  const s = new Site({ name: 'Name only' });
  const ss = Site.fromJSON(s.toJSON());
  t.deepEqual(s, ss);
  t.is(ss.key, 'Name_only');
  t.is(ss.name, 'Name only');
});

test('all properties', t => {
  const s = new Site({
    key: 'props',
    name: 'Properties',
    urls: ['https://alias.com', 'https://something-else.com', 'https://test.com']
  });

  const ss = Site.fromJSON(s.toJSON());
  t.deepEqual(s, ss);
  
  t.is(ss.key, 'props');
  t.is(ss.name, 'Properties');
  t.is(ss.urls.size, 3);
});
