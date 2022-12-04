import is from '@sindresorhus/is';
import * as htmlparser2 from "htmlparser2";
import { Handler, Result as HtmlMetaResult } from "htmlmetaparser";
import * as cheerio from 'cheerio';

import { htmlToText, HtmlToTextOptions } from 'html-to-text';

import { Properties } from '../model/helpers/properties.js';

export { social as getSocialLinks, parseOpenGraph as getOpenGraph } from 'crawlee';
import { Resource } from '../model/index.js';

export function getPlainText(html: string, options?: HtmlToTextOptions): string {
  return htmlToText(html, options);
}

export function parseFeed(
  feed: string | Buffer,
  options?: Parameters<typeof htmlparser2.parseFeed>[1]
  ) {
  return htmlparser2.parseDocument(feed.toString());
}

export function getDocument(
  html: string | Buffer,
  options?: Parameters<typeof htmlparser2.parseDocument>[1]
  ) {
  return htmlparser2.parseDocument(html.toString());
}

export function parseWithCheerio(
  html: string | Buffer,
  options?: Parameters<typeof cheerio.load>[1]
 ): cheerio.Root {
  return cheerio.load(html, options);
}

export function getMetadata(input: string | Resource, baseUrl?: string) {
  const html = is.string(input) ? input : input.body ?? '';
  const url = (input instanceof Resource) ? input.url : input ?? '';
  
  let output: HtmlMetaResult | undefined;

  const handler = new Handler(
    (err, result) => { 
      if (err instanceof Error) throw err;
      output = result;
    },
    { url }
  );
  
  const parser = new htmlparser2.Parser(handler, { decodeEntities: true });
  parser.write(html);
  parser.end();

  if (is.undefined(output)) {
    throw new Error('Could not parse document.');
  } else {
    const { html, ...remainder } = output;
    return {
      head: html,
      ...remainder
    }
    return output;
  }
}

export function getBodyAttributes(input: string | cheerio.Root): Properties<string> {
  const $ = is.string(input) ? parseWithCheerio(input) : input;
  let results: Properties<string> = { ...$('body').attr() };
  if ('class' in results) {
    results.class = results.class?.toString().replace(/\s+/, ' ').split(' ');
  }
  return results;
}

