/* eslint-disable ava/no-only-test */

import test from 'ava';
import { chopBySelector } from '../../src/tools/html/index.js';

const html = `<html>
<head><title>Test</title>
<body>
<h1>headline</h1>
<p>first <span class='example'>paragraph</span></p>
<p>second paragraph</p>
<footer>This is some markup, <a href="/url.html">and a link.</a></footer>
</body>
</html>`;

test('simple select', t => {
  const output = chopBySelector(html, 'p');
  t.is(output.main, '<p>first <span class="example">paragraph</span></p>,<p>second paragraph</p>');
})

test('a links', t => {
  const output = chopBySelector(html, { main: 'p', footer: 'footer a' });
  t.is(output.footer, '<a href="/url.html">and a link.</a>');
});

test('remainder', t => {
  const output = chopBySelector(html, { main: { selector: 'body' } }, 'other');
  t.is(output.other, `<html><head><title>Test</title>
</head></html>`);
});