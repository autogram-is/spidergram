import is from '@sindresorhus/is';
import * as htmlparser2 from "htmlparser2";
import { Handler, Result as HtmlMetaResult, ResultHtml } from "htmlmetaparser";
import * as cheerio from 'cheerio';
import { htmlToText, HtmlToTextOptions } from 'html-to-text';
import { Resource } from '../model/index.js';


export { social as getSocialLinks, parseOpenGraph as getOpenGraph } from 'crawlee';

export function getPlainText(html: string, options?: HtmlToTextOptions): string {
  return htmlToText(html, options);
}

export function parseWithCheerio(
  html: string | Buffer,
  options?: Parameters<typeof cheerio.load>[1]
 ): cheerio.Root {
  return cheerio.load(html, options);
}

type MetadataResponse = Omit<HtmlMetaResult, 'links' | 'images'> & { head?: ResultHtml };
export async function getMetadata(input: string | Resource, baseUrl?: string) {
  const html = is.string(input) ? input : input.body ?? '';
  const url = (input instanceof Resource) ? input.url : input ?? '';
  
  let output: HtmlMetaResult | undefined;

  return new Promise<MetadataResponse>((resolve, reject) => {
    const handler = new Handler(
      (err, result) => { 
        if (err instanceof Error) reject(err);
        const { html, links, images, ...remainder } = result;
        resolve({  head: html, ...remainder });
      },
      { url }
    );
    
    const parser = new htmlparser2.Parser(handler, { decodeEntities: true });
    parser.write(html);
    parser.end();
  
    if (is.undefined(output)) {
      throw new Error('Could not parse document.');
    } else {
      const { html, links, images, ...remainder } = output;
      return {
        meta: html,
        ...remainder
      }
      return output;
    }
  })
}

export function getBodyAttributes(input: string | cheerio.Root) {
  const $ = is.string(input) ? parseWithCheerio(input) : input;
  let output: Record<string, string | string[]> = { ...$('body').attr() };
  if ('class' in output) {
    output.class = output.class?.toString().replace(/\s+/, ' ').split(' ');
  }
  return output;
}

