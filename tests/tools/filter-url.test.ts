import { ParsedUrl, ParsedUrlSet } from "@autogram/url-tools";
import { UrlTools } from "../../src/index.js";
import { readFileSync } from "fs";
import test from 'ava';
import { UrlMatchStrategy } from "../../src/tools/urls/url-match-strategy.js";

/**
 * The library we're using for glob testing -- minimatch -- is powerful but
 * can be confusing due to the rules around slashes that derive from globbing's
 * pathname, rather than url, focus.
 * 
 * @see {@link https://github.com/isaacs/minimatch | the minimatch project} for docs on the glob library and its rules  
 * @see {@link http://pthrasher.github.io/minimatch-test | minimatch tester} to try example patterns
 */
const url = new ParsedUrl('https://user:password@subdomain.subdomain.example.co.uk:8080/directory/filename.html?firstParam=1&secondParam=2#anchor');

test('simple booleans', t => {
  t.false(UrlTools.filterUrl(url, false));
  t.true(UrlTools.filterUrl(url, true));

  t.true(UrlTools.filterUrl(url, UrlTools.UrlMatchStrategy.All));
  t.false(UrlTools.filterUrl(url, UrlTools.UrlMatchStrategy.None));

  t.true(UrlTools.filterUrl(url, () => true));
  t.false(UrlTools.filterUrl(url, () => false));
});

test('same-domain strategy', t => {
  t.true(UrlTools.filterUrl(
    url, 
    UrlTools.UrlMatchStrategy.SameDomain,
    { contextUrl: 'https://example.co.uk' }
  ));

  t.true(UrlTools.filterUrl(
    url, 
    UrlTools.UrlMatchStrategy.SameDomain,
    { contextUrl: 'https://www.example.co.uk' }
  ));

  t.false(UrlTools.filterUrl(
    url, 
    UrlTools.UrlMatchStrategy.SameDomain,
    { contextUrl: 'https://example.com' }
  ));
});

test('same-hostname strategy', t => {
  t.false(UrlTools.filterUrl(
    url, 
    UrlTools.UrlMatchStrategy.SameHostname,
    { contextUrl: 'https://example.co.uk' }
  ));
  
  t.true(UrlTools.filterUrl(
    url, 
    UrlTools.UrlMatchStrategy.SameHostname,
    { contextUrl: 'https://subdomain.subdomain.example.co.uk' }
  ));
});

test('same-directory strategy', t => {
  t.true(UrlTools.filterUrl(
    url, 
    UrlTools.UrlMatchStrategy.SameDirectory,
    { contextUrl: 'https://subdomain.subdomain.example.co.uk' }
  ));

  t.true(UrlTools.filterUrl(
    url, 
    UrlTools.UrlMatchStrategy.SameDirectory,
    { contextUrl: 'https://subdomain.subdomain.example.co.uk/directory' }
  ));

  t.false(UrlTools.filterUrl(
    url, 
    UrlTools.UrlMatchStrategy.SameDirectory,
    { contextUrl: 'https://subdomain.subdomain.example.co.uk/directory/subdirectory' }
  ));
});

test('string glob', t => {
  t.true(UrlTools.filterUrl(url, '**/*example*/**'));
  t.false(UrlTools.filterUrl(url, '**/*example*'));
  t.false(UrlTools.filterUrl(url, 'some-string'));
});

test('structured glob', t => {
  t.true(UrlTools.filterUrl(url, { glob: '**/*example*/**' }));
  t.false(UrlTools.filterUrl(url, { glob: '**/*example*' }));

  t.true(UrlTools.filterUrl(url, { glob: 'example.co.uk', property: 'domain' }));
  t.true(UrlTools.filterUrl(url, { glob: 'example.*', property: 'domain' }));
  t.true(UrlTools.filterUrl(url, { glob: 'example.{co.uk,com}', property: 'domain' }));
  t.false(UrlTools.filterUrl(url, { glob: 'not-example.*', property: 'domain' }));

  t.true(UrlTools.filterUrl(url, { glob: '**/*.html', property: 'pathname' }));
  t.false(UrlTools.filterUrl(url, { glob: '*.html', property: 'pathname' }));

  t.true(UrlTools.filterUrl(url, { glob: '1', property: 'searchParams.firstParam' }));
  t.false(UrlTools.filterUrl(url, { glob: '2', property: 'searchParams.firstParam' }));
  t.false(UrlTools.filterUrl(url, { glob: '*', property: 'searchParams.ninthParam' }));
});

test('regex', t => {
  t.true(UrlTools.filterUrl(url, { regex: '.*example.co.uk.*' }));
  t.true(UrlTools.filterUrl(url, { regex: /.*example.co.uk.*/ }));
  t.true(UrlTools.filterUrl(url, { regex: /.*example.co.uk.*/, property: 'hostname' }));
  t.true(UrlTools.filterUrl(url, /.*example.co.uk.*/ ));
  t.false(UrlTools.filterUrl(url, { regex: /definitely-not-the-domain/, property: 'hostname' }));
});

test('predicate function', t => {
  t.true(UrlTools.filterUrl(url, 
    url => url.domain === 'example.co.uk'
  ));

  t.true(UrlTools.filterUrl(url, 
    url => url.searchParams.get('firstParam') === '1'
  ));

  t.false(UrlTools.filterUrl(url, 
    url => url.path.length > 10
  ));
});

test('multiple filters', t => {
  t.true(UrlTools.filterUrl(url, [() => true, () => true]));
  t.true(UrlTools.filterUrl(url, [() => true, () => false]));

  t.true(UrlTools.filterUrl(url, [() => true, () => true], { mode: 'any' }));
  t.true(UrlTools.filterUrl(url, [() => true, () => false], { mode: 'any' }));
  t.true(UrlTools.filterUrl(url, [() => false, () => true], { mode: 'any' }));
  t.false(UrlTools.filterUrl(url, [() => false, () => false], { mode: 'any' }));

  t.true(UrlTools.filterUrl(url, [() => true, () => true], { mode: 'all' }));
  t.false(UrlTools.filterUrl(url, [() => true, () => false], { mode: 'all' }));
  t.false(UrlTools.filterUrl(url, [() => false, () => true], { mode: 'all' }));
  t.false(UrlTools.filterUrl(url, [() => false, () => false], { mode: 'all' }));
  
  t.false(UrlTools.filterUrl(url, [() => true, () => true], { mode: 'none' }));
  t.false(UrlTools.filterUrl(url, [() => true, () => false], { mode: 'none' }));
  t.false(UrlTools.filterUrl(url, [() => false, () => true], { mode: 'none' }));
  t.true(UrlTools.filterUrl(url, [() => false, () => false], { mode: 'none' }));
});

test('reject filters', t => {
  t.true(UrlTools.filterUrl(url, [
    { property: 'domain', glob: 'example.co.uk' },
    UrlMatchStrategy.All
  ]));

  t.false(UrlTools.filterUrl(url, [
    { property: 'domain', glob: 'example.co.uk', reject: true },
    UrlMatchStrategy.All
  ]));
});

test('multiple urls', t => {
  const buffer = readFileSync('./tests/fixtures/urls/mixed-urls.json');
  const json = JSON.parse(buffer.toString()) as Record<string, unknown>;
  const urls = [...new ParsedUrlSet(json.normalizedUrlVariations as string[])];

  let results = UrlTools.filterUrls(urls, { glob: 'example.com', property: 'hostname' });
  t.is(results.length, 6);

  results = UrlTools.filterUrls(urls, { glob: '?anchor', property: 'hash' });
  t.is(results.length, 1);

  results = UrlTools.filterUrls(
    urls, [
      { glob: 'example.com', property: 'hostname' },
      { glob: 'https:', property: 'protocol' },
    ], { mode: 'all' }
  );
  t.is(results.length, 5);
});
