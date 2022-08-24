import is from '@sindresorhus/is';
import { Resource } from '../graph';
import { Dictionary } from '@autogram/autograph';
import { CheerioParser, CheerioOptions } from './cheerio.js';
import { Mime } from '../util/mime';
import MIMEType from 'whatwg-mimetype';

export type SitemapLink = {
  href: string,
  title?: string,
  publication?: string,
  updated?: string,
  changefreq?: string,
  priority?: number
};

const selectors = {
  'xml': 'urlset url',
  'index': 'sitemapindex sitemap',
  'atom': 'feed entry link',
  'html': 'body a',
  'rss': 'rss channel item',
};

export const linksFromSitemap = (
  r: Resource,
  customOptions: CheerioOptions = {}
): SitemapLink[] => {
  const results: SitemapLink[] = [];
  if (is.nonEmptyStringAndNotWhitespace(r.body)) {
    
    // Try to guess the format from the content-type headers.
    let mimeType: MIMEType | undefined;
    if (mimeType = Mime.parse(r.headers['content-type']?.toString() ?? '')) {
      // Horrible degenerate text files full of URLs; split on newlines and call it a day.
      if (mimeType.essence === 'text/plain') {
        return r.body.split('\n').map(url => { return { href: url.trim() }} );
      }

      if (mimeType?.isXML()) {
        // Either XML sitemap, Atom, RSS, or XML Sitemap Index…
        // We'll try selectors for all of the above, just in case.
        customOptions.xmlMode = true;
      }
    }

    const $ = new CheerioParser(r.body, customOptions).root;

    // Traditional XML Sitemap
    $('urlset url').each((i, e) => {
      const href = $(e).find('loc').text();
      const updated = $(e).find('lastmod').text();
      const changefreq = $(e).find('changefreq')?.text();
      const priority = $(e).find('priority')?.text();
      if (is.nonEmptyStringAndNotWhitespace(href)) {
        results.push({
          href: href,
          updated: updated,
          changefreq: changefreq,
          priority: is.numericString(priority) ? Number(priority) : undefined,
        });
      }
    });

    if (results.length === 0) {
      // Sitemap Index
      $('sitemapindex sitemap').each((i, e) => {
        const href = $(e).find('loc').text();
        const updated = $(e).find('lastmod')?.text();
        if (is.nonEmptyStringAndNotWhitespace(href)) {
          results.push({
            href: href,
            updated: updated,
          });
        };
      });  
    };

    if (results.length === 0) {
      // Atom
      $('feed entry').each((i, e) => {
        const href = $(e).find('link')?.attr('href');
        const updated = $(e).find('updated')?.text();
        if (is.nonEmptyStringAndNotWhitespace(href)) {
          results.push({
            href: href,
            updated: updated,
          });
        };
      });  
    }

    if (results.length === 0) {
      // RSS
      $('rss channel item').each((i, e) => {
        const href = $(e).find('link')?.text();
        const updated = $(e).find('pubDate')?.text();
        if (is.nonEmptyStringAndNotWhitespace(href)) {
          results.push({
            href: href,
            updated: updated,
          });
        };
      });
    };

    // Blind HTML parsing is our fallback if nothing else works.
    if (results.length === 0) {
      // HTML
      $('body a').each((i, e) => {
        const href = $(e).attr('href');
        const title = $(e).text();
      });
    }
  };
  return results;
};
