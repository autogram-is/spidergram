import { HtmlTools } from '../index.js';
import { getCheerio } from './get-cheerio.js';
import arrify from 'arrify';
import { getUniqueSelector } from './get-unique-selector.js';

export interface FoundLink {
  [keyof: string]: unknown;
  url?: string;
  title?: string;
  text?: string;
  html?: string;
  attributes?: Record<string, string>;
  data?: Record<string, string>;
  tagName?: string;
  selector?: string;
  region?: string;
  label?: string;
}

export const LinkSelector: Record<string, string> = {
  anchor: 'a',
  any: '[href], [src]',
  feed: 'head link[rel=alternate][type$=xml]',
  link: 'link',
  sitemap: 'head link[rel=sitemap]',
};

export function findLinks(
  input: string | cheerio.Root,
  selectors: string | string[] = LinkSelector.anchor,
) {
  const $ = typeof input === 'string' ? getCheerio(input) : input;
  const results: FoundLink[] = [];
  for (const selector of arrify(selectors)) {
    $(selector)
      .toArray()
      .forEach(element => {
        const data = getLinkElementAttributes(element, $);
        if (data) results.push({ ...data, selector });
      });
  }
  return results;
}

export function findHtmlUrls(input: string | cheerio.Root) {
  return findLinks(input, '[href], [src]');
}
export function findBodyAnchors(input: string | cheerio.Root) {
  return findLinks(input, 'body a');
}

export function findHeadLinks(input: string | cheerio.Root) {
  return findLinks(input, 'head link');
}

/**
 * Finds links (with titles and publication dates, if present) in Sitemap
 * and SitemapIndex XML markup.
 */
export function findSitempLinks(input: string | cheerio.Root) {
  const $ =
    typeof input === 'string' ? getCheerio(input, { xmlMode: true }) : input;
  const results: FoundLink[] = [];
  $('urlset url')
    .toArray()
    .forEach(element => {
      results.push({
        url: $(element).find('loc').text(),
        title: $(element).find('title').text() ?? undefined,
        date: $(element).find('lastmod').text() ?? undefined,
        changfreq: $(element).find('changefreq').text() ?? undefined,
        priority: $(element).find('priority').text() ?? undefined,
      });
    });

  $('sitemapindex sitemap')
    .toArray()
    .forEach(element => {
      results.push({
        url: $(element).find('loc').text(),
        date: $(element).find('lastmod').text() ?? undefined,
      });
    });

  return results;
}

/**
 * Finds links (with titles and publication dates, if present) in RSS
 * and Atom feed markup.
 */
export function findFeedLinks(input: string | cheerio.Root) {
  const $ =
    typeof input === 'string' ? getCheerio(input, { xmlMode: true }) : input;
  const results: FoundLink[] = [];
  $('channel item')
    .toArray()
    .forEach(element => {
      results.push({
        url: $(element).find('link').text(),
        title: $(element).find('title').text() ?? undefined,
        date: $(element).find('pubDate').text() ?? undefined,
      });
    });

  $('feed entry')
    .toArray()
    .forEach(element => {
      results.push({
        url: $(element).find('link').attr('href')?.toString(),
        title: $(element).find('title').text() ?? undefined,
        date: $(element).find('updated').text() ?? undefined,
      });
    });

  return results;
}

// TODO: Convert this code to use getElementData

export function getLinkElementAttributes(
  element: cheerio.Element,
  $: cheerio.Root,
) {
  const attributes = $(element).attr();
  const dataAttributes = $(element).data() ?? {};
  const html = $.html(element)?.trim() ?? '';
  const result = {
    url: attributes.href ?? attributes.src,
    attributes: attributes,
    data: Object.keys(dataAttributes).length > 0 ? dataAttributes : undefined,
    text: HtmlTools.getVisibleText(html),
    readableText: HtmlTools.getReadableText(html),
    uniqueSelector: getUniqueSelector(element, $),
    html: html,
    tag: (element as { tagName?: string }).tagName,
  } as FoundLink;
  return result;
}
