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

export function getMetadata(input: string | cheerio.Root): Properties {
  const $ = is.string(input) ? parseWithCheerio(input) : input;
  const results: Properties = {};
  const meta = $('head meta');
  meta.each((index, element) => {
    const key
      = $(element).attr('name')?.trim() ?? $(element).attr('property')?.trim();
    const value = $(element).attr('content')?.trim();
    if (key) {
      if (key === 'description') {
        setProp(results, key, value);
      } else {
        appendProperty(results, key, value);
      }
    }
  });

  results.bodyAttributes = $('body').attr();
  const bodyClasses = $('body').attr('class');
  if (bodyClasses) {
    results.bodyAttributes.class = bodyClasses.replace(/\s+/, ' ').split(' ');
  }

  results.title = getProperty(
    results,
    'og.title',
    $('head title').text().toString(),
  );

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
