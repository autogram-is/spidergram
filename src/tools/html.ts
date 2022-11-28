import is from '@sindresorhus/is';
import arrify from 'arrify';
import * as cheerio from 'cheerio';
import {JSDOM} from 'jsdom';
import * as xpath from 'xpath-ts';
import { htmlToText, HtmlToTextOptions } from 'html-to-text';
import {
  Property,
  Properties,
  getProperty,
  setProperty,
} from '../model/helpers/properties.js';
export { social as getSocialLinks, parseOpenGraph as getOpenGraph } from 'crawlee';
import { Thing, Graph as SchemaGraph } from "schema-dts";

export function getPlainText(html: string, options?: HtmlToTextOptions): string {
  return htmlToText(html, options);
}

export function parseWithJsDom(
  html: string | Buffer,
  options?: ConstructorParameters<typeof JSDOM>[1]
  ): JSDOM {
  return new JSDOM(html, options);
}

export function parseWithCheerio(
  html: string | Buffer,
  options?: Parameters<typeof cheerio.load>[1]
 ): cheerio.Root {
  return cheerio.load(html, options);
}

export function selectWithXPath(input: string | JSDOM, selector: string) {
  const jsdom = is.string(input) ? parseWithJsDom(input) : input;
  return xpath.select(selector, jsdom.window.document);
}

export function selectWithCSS(input: string | cheerio.Root, selector: string) {
  const $ = is.string(input) ? parseWithCheerio(input) : input;
  return $(selector);
}

export function getMetaTags(input: string | cheerio.Root): Properties {
  const $ = is.string(input) ? parseWithCheerio(input) : input;
  const keyNames = ['name', 'property', 'itemprop', 'http-equiv'];
  const results: Properties = {};

  $('head meta').each((index, element) => {
    const key = Object.keys($(element).attr()).find(value => keyNames.indexOf(value) !== -1);
    if (key) {
      const value = $(element).attr('content')?.trim();
      if (key === 'description') setProp(results, key, value);
      else appendProperty(results, key, value);
    }
  });

  results.title = getProperty(
    results,
    'og.title',
    $('head title').text().toString(),
  );

  return results;
}


// Right now this only works with a single @graph element. Later we'll want to graph
// any JSON-LD chunks and turn them into an array.
export function getSchemaOrg(input: string | cheerio.Root): readonly Thing[] {
  const $ = is.string(input) ? parseWithCheerio(input) : input;
  let results: readonly Thing[] = [];
  try {
    $('script[type=application/ld+json]').each((index, element) => {
      const json = JSON.parse($(element).text()) as SchemaGraph;
      if ('@context' in json && json["@context"] == 'https://schema.org') {
        results = json["@graph"];
      }  
    })
  } catch {
    results = [];
  }
  return results;
}

export function getBodyAttributes(input: string | cheerio.Root): Properties {
  const $ = is.string(input) ? parseWithCheerio(input) : input;
  let results: Properties = { ...$('body').attr() };
  if ('class' in results) {
    results.class = results.class?.toString().replace(/\s+/, ' ').split(' ');
  }
  return results;
}

function setProp(
  object: Properties,
  key: string,
  value: Property,
  keyDelimiter = ':',
) {
  const path = key.replace(keyDelimiter, '.');
  setProperty(object, path, value);
}

function appendProperty(
  object: Properties,
  key: string,
  value: Property,
  keyDelimiter = ':',
) {
  const path = key.replace(keyDelimiter, '.');
  const currentProp = getProperty(object, path);

  if (is.undefined(currentProp)) {
    setProperty(object, path, value);
  } else {
    setProperty(object, path, [...arrify(currentProp), ...arrify(value)]);
  }
}

