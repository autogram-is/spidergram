export * from './cheerio/cheerio-spider.js';

export type HtmlLink = {
  href: string;
  context?: string;
  rel?: string;
  title?: string;
  attributes?: Record<string, string>;
  data?: string | Record<string, string>;
};
