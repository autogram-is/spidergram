/* eslint-disable ava/no-only-test */

import test from 'ava';
import { getHtmlRegions } from '../../src/tools/html/index.js';
import { getCheerio } from '../../src/tools/html/index.js';

const html = getCheerio(`<html>
<head><title>Test</title>
<body>
<h1>headline</h1>
<p>first <span class='example'>paragraph</span></p>
<p>second paragraph</p>
<footer>This is some markup, <a href="/url.html">and a link.</a></footer>
</body>
</html>`).html();

test('simple select', t => {
  const output = getHtmlRegions(html, 'p');
  t.is(output.p, '<p>first <span class="example">paragraph</span></p>,<p>second paragraph</p>');
})

test('a links', t => {
  const output = getHtmlRegions(html, { main: 'p', footer: 'footer a' });
  t.is(output.footer, '<a href="/url.html">and a link.</a>');
});

test('remainder', t => {
  const output = getHtmlRegions(html, { main: { selector: 'body' } }, { fallbackRegion: 'foo'} );
  t.is(output.foo, `<html><head><title>Test</title>
</head></html>`);
});

test('untouched remainder', t => {
  const output = getHtmlRegions(html, { main: { selector: 'body' } }, { removeFoundElements: false} );
  t.is(output.other, html);
});