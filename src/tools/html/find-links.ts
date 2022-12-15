import { parseWithCheerio } from "./parse-with-cheerio.js";
import arrify from "arrify";

export type LinkData = Record<string, unknown> & {
  url?: string;
  title?: string,
  text?: string,
  attributes?: Record<string, string>,
  data?: Record<string, string>,
  tagName?: string,
  selector?: string,
};

export const LinkSelector: Record<string, string> = {
  anchor: 'a',
  any: '[href], [src]',
  feed: 'head link[rel=alternate][type$=xml]',
  link: 'link',
  sitemap: 'head link[rel=sitemap]',
}

export function findLinks(input: string | cheerio.Root, selectors: string | string[] = LinkSelector.anchor) {
  const $ = (typeof(input) === 'string') ? parseWithCheerio(input) : input;
  const results: LinkData[] = [];
  for (let selector of arrify(selectors)) {
    $(selector).toArray().forEach((element) => {
      const data = getLinkData(element, $);
      if (data) results.push({ ...data,  selector });
    });
  }
  return results;
}

export function findBodyLinks(input: string | cheerio.Root) {
  //const $ = (typeof(input) === 'string') ? parseWithCheerio(input, { xmlMode: true }) : input;
  const results: LinkData[] = [];
  return results;
}

export function findHeadLinks(input: string | cheerio.Root) {
  //const $ = (typeof(input) === 'string') ? parseWithCheerio(input, { xmlMode: true }) : input;
  const results: LinkData[] = [];
  return results;
}

export function findSitemapLinks(input: string | cheerio.Root) {
  //const $ = (typeof(input) === 'string') ? parseWithCheerio(input, { xmlMode: true }) : input;
  const results: LinkData[] = [];
  return results;
}

export function findFeedLinks(input: string | cheerio.Root) {
  //const $ = (typeof(input) === 'string') ? parseWithCheerio(input, { xmlMode: true }) : input;
  const results: LinkData[] = [];
  return results;
}

export function getLinkData(element: cheerio.Element, $: cheerio.Root) {
  const attributes = $(element).attr();
  const text = $(element).text().trim();
  const dataAttributes = $(element).data() ?? {};
  const result = {
    url: attributes.href ?? attributes.src,
    attributes: attributes,
    text: text.length > 0 ? text : undefined,
    data: Object.keys(dataAttributes).length > 0 ? dataAttributes : undefined,
    tag: (element as { tagName?: string }).tagName,
  } as LinkData;
  return result;
}
