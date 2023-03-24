import test from 'ava';
import { findPropertyValue } from '../../src/index.js';

const obj = {
  num: 1,
  arr: ['first', 'second', 'third'],
  numArr: [1, 2, 3],
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
  t.is(findPropertyValue(obj, { source: 'html', selector: 'p', join: ', ' }), 'first paragraph, second paragraph');
  t.is(findPropertyValue(obj, { source: 'html', selector: 'p', limit: 1 }), 'first paragraph');
  t.deepEqual(findPropertyValue(obj, { source: 'html', selector: 'p', limit: 2 }), ['first paragraph', 'second paragraph']);
  t.is(findPropertyValue(obj, { source: 'html', selector: 'iframe' }), undefined);
});

test('predicate', t => {
  t.is(findPropertyValue(obj, {
    source: 'arr',
    fn: val => Array.isArray(val) ? val[1] : undefined
  }), 'second');
});

test('filters', t => {
  // gotta investigate the 'contains' operator
  
  t.is(findPropertyValue(obj, { source: 'null', eq: null, nullIsValue: true }), null);
  t.is(findPropertyValue(obj, { source: 'null', eq: null }), undefined);
  t.is(findPropertyValue(obj, { source: 'null', eq: null, negate: true }), undefined);

  t.is(findPropertyValue(obj, { source: 'num', eq: 1 }), 1);
  t.is(findPropertyValue(obj, { source: 'num', gt: 0 }), 1);
  t.is(findPropertyValue(obj, { source: 'num', lt: 0 }), undefined);

  t.is(findPropertyValue(obj, { source: 'num', in: [1, 2, 3] }), 1);
  t.is(findPropertyValue(obj, { source: 'nested.deeply.leaf', in: ['value', 'another value'] }), 'value');

  t.deepEqual(findPropertyValue(obj, { source: 'nested', eq: { deeply: { leaf: 'value' }} }), { deeply: { leaf: 'value' }});

  t.is(findPropertyValue(obj, { source: 'arr', in: ['fourth', 'third'] }), 'third');
  t.is(findPropertyValue(obj, { source: 'arr', in: ['fourth'] }), undefined);
});
