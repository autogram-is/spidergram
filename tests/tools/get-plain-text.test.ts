import test from 'ava';
import { Spidergram, HtmlTools } from '../../src/index.js';

await Spidergram.load();
const html = `<a href="https://example.com"><img src="foo.jpg" alt="ALT"/>LINK</a>`;

test('plain strips urls and images', t => {
  t.is(HtmlTools.getPlaintext(html), 'LINK');
});

test('plain and visible are the same', t => {
  t.is(HtmlTools.getPlaintext(html), HtmlTools.getVisibleText(html));
});


test('readable strips urls keeps images', t => {
  t.is(HtmlTools.getReadableText(html), 'ALT LINK');
});