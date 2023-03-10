import test from 'ava';
import { findPropertyValue } from '../../src/index.js';

const obj = {
  num: 1,
  arr: ['first', 'second', 'third'],
  str: 'string',
  null: null,
  nested: {
    deeply: {
      leaf: 'value'
    }
  },
  html: "<body><h1>headline</h1><p>first <span class='example'>paragraph</span></p><p>second paragraph</p></body>",
}

test('simple paths', t => {
  t.is(findPropertyValue(obj, 'num'), 1);
  t.is(findPropertyValue(obj, 'arr[0]'), 'first');
  t.is(findPropertyValue(obj, 'str'), 'string');
  t.is(findPropertyValue(obj, 'null'), undefined);
  t.is(findPropertyValue(obj, 'null', 'default'), 'default');
  t.is(findPropertyValue(obj, 'str', 'default'), 'string');
  t.is(findPropertyValue(obj, 'nested.deeply.leaf'), 'value');
});

test('css selectors', t => {
  t.is(findPropertyValue(obj, { source: 'html', selector: 'h1' }), 'headline');
  t.is(findPropertyValue(obj, { source: 'html', selector: 'p' }), 'first paragraph');
});

test('predicate', t => {
  t.is(findPropertyValue(obj, {
    source: 'arr',
    fn: val => Array.isArray(val) ? val.pop() : undefined
  }), 'third');
});


