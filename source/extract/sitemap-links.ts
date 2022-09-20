import is from '@sindresorhus/is';
import { Dictionary } from '@autogram/autograph';
import MIMEType from 'whatwg-mimetype';
import { Resource } from '../graph/index.js';
import { Mime } from '../util/mime.js';
import { CheerioParser, CheerioOptions } from './cheerio.js';

export type SitemapLink = {
  href: string;
  context?: string;
  title?: string;
  publication?: string;
  updated?: string;
  changefreq?: string;
  priority?: number;
};

const selectors = {
  xml: 'urlset url',
  index: 'sitemapindex sitemap',
  atom: 'feed entry link',
  html: 'body a',
  rss: 'rss channel item',
};

export const linksFromSitemap = (
  r: Resource,
  customOptions: CheerioOptions = {},
): SitemapLink[] => {
  const results: SitemapLink[] = [];
  if (is.nonEmptyStringAndNotWhitespace(r.body)) {
    // Try to guess the format from the content-type headers.
    let mimeType: MIMEType | undefined;
    if ((mimeType = Mime.parse(r.headers['content-type']?.toString() ?? ''))) {
      // Horrible degenerate text files full of URLs; split on newlines and call it a day.
      if (mimeType.essence === 'text/plain') {
        return r.body.split('\n').map((url) => {
          return { href: url.trim() };
        });
      }

      if (mimeType?.isXML()) {
        // Either XML sitemap, Atom, RSS, or XML Sitemap Index…
        // We'll try selectors for all of the above, just in case.
        customOptions.xmlMode = true;
      }
    }

    const $ = new CheerioParser(r.body, customOptions).root;

    // Traditional XML Sitemap
    $('urlset url').each((i, element) => {
      const href = $(element).find('loc').text();
      const updated = $(element).find('lastmod').text();
      const changefreq = $(element).find('changefreq')?.text();
      const priority = $(element).find('priority')?.text();
      if (is.nonEmptyStringAndNotWhitespace(href)) {
        results.push({
          href,
          context: 'sitemap',
          updated,
          changefreq,
          priority: is.numericString(priority) ? Number(priority) : undefined,
        });
      }
    });

    if (results.length === 0) {
      // Sitemap Index
      $('sitemapindex sitemap').each((i, element) => {
        const href = $(element).find('loc').text();
        const updated = $(element).find('lastmod')?.text();
        if (is.nonEmptyStringAndNotWhitespace(href)) {
          results.push({
            href,
            context: 'sitemap-index',
            updated,
          });
        }
      });
    }

    if (results.length === 0) {
      // Atom
      $('feed entry').each((i, element) => {
        const href = $(element).find('link')?.attr('href');
        const updated = $(element).find('updated')?.text();
        if (is.nonEmptyStringAndNotWhitespace(href)) {
          results.push({
            href,
            context: 'atom-feed',
            updated,
          });
        }
      });
    }

    if (results.length === 0) {
      // RSS
      $('rss channel item').each((i, element) => {
        const href = $(element).find('link')?.text();
        const updated = $(element).find('pubDate')?.text();
        if (is.nonEmptyStringAndNotWhitespace(href)) {
          results.push({
            href,
            context: 'rss-feed',
            updated,
          });
        }
      });
    }

    // Blind HTML parsing is our fallback if nothing else works.
    if (results.length === 0) {
      // HTML
      $('body a').each((i, element) => {
        $(element).attr('href');
        ('text-sitemap');
        $(element).text();
      });
    }
  }

  return results;
};
