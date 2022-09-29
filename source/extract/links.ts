import is from '@sindresorhus/is';
import * as cheerio from 'cheerio';

export type HtmlLink = {
  href: string;
  context?: string;
  rel?: string;
  title?: string;
  attributes?: Record<string, string>;
  data?: string | Record<string, string>;
};

export const getLinks = (
  input: cheerio.Root | string,
  selectors: string | Record<string, string> = 'body a',
  ignoreSelfLinkAnchors: true,
  ignoreEmptyHref: true,
): HtmlLink[] => {
  const results: HtmlLink[] = [];
  const $ = is.string(input) ? cheerio.load(input) : input;
  if (typeof selectors === 'string') {
    selectors = { default: selectors };
  }

  for (const key in selectors) {
    $(selectors[key]).each((i, element) => {
      const href: string = $(element).attr('href') ?? '';

      if (
        !(href.length === 0 && ignoreEmptyHref) &&
        !(href.startsWith('#') && ignoreSelfLinkAnchors)
      ) {
        results.push({
          href,
          context: key,
          rel: $(element).attr('rel') ?? '',
          title: $(element).text() ?? '',
          attributes: $(element).attr() as Record<string, string>,
          data: $(element).data() ?? {},
        });
      }
    });
  }

  return results;
};
