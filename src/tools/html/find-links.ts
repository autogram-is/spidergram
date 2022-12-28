import { parseWithCheerio } from './parse-with-cheerio.js';
import arrify from 'arrify';

export interface FoundLink {
  [keyof: string]: unknown;
  url?: string;
  title?: string;
  text?: string;
  attributes?: Record<string, string>;
  data?: Record<string, string>;
  tagName?: string;
  selector?: string;
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
  const $ = typeof input === 'string' ? parseWithCheerio(input) : input;
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
export function findLinksInSitemap(input: string | cheerio.Root) {
  const $ = typeof input === 'string' ? parseWithCheerio(input, { xmlMode: true }) : input;
  const results: FoundLink[] = [];
  $('urlset url')
    .toArray()
    .forEach(element => {
      results.push({
        url: $(element).find('loc').text(),
        title: $(element).find('title').text(),
        date: $(element).find('lastmod').text(),
        changfreq: $(element).find('changefreq').text(),
        priority: $(element).find('priority').text(),
        label: 'sitemap',
      });
    });

  $('sitemapindex sitemap')
    .toArray()
    .forEach(element => {
      results.push({
        url: $(element).find('loc').text(),
        date: $(element).find('lastmod').text(),
        label: 'sitemap',
      });
    });

  return results;
}

/**
 * Finds links (with titles and publication dates, if present) in RSS
 * and Atom feed markup.
 */
export function findLinksInFeed(input: string | cheerio.Root) {
  const $ =
    typeof input === 'string'
      ? parseWithCheerio(input, { xmlMode: true })
      : input;
  const results: FoundLink[] = [];
  $('channel item')
    .toArray()
    .forEach(element => {
      results.push({
        url: $(element).find('link').text(),
        title: $(element).find('title').text(),
        date: $(element).find('pubDate').text(),
        label: 'rss',
      });
    });

  $('feed entry')
    .toArray()
    .forEach(element => {
      results.push({
        url: $(element).find('link').attr('href')?.toString(),
        title: $(element).find('title').text(),
        date: $(element).find('updated').text(),
        label: 'atom',
      });
    });

  return results;
}

export function getLinkElementAttributes(
  element: cheerio.Element,
  $: cheerio.Root,
) {
  const attributes = $(element).attr();
  const text = $(element).text().trim();
  const dataAttributes = $(element).data() ?? {};
  const result = {
    url: attributes.href ?? attributes.src,
    attributes: attributes,
    text: text.length > 0 ? text : undefined,
    data: Object.keys(dataAttributes).length > 0 ? dataAttributes : undefined,
    tag: (element as { tagName?: string }).tagName,
  } as FoundLink;
  return result;
}
