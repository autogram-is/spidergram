import is from '@sindresorhus/is';
import { Dictionary } from '@autogram/autograph';
import { Resource } from '../graph/index.js';
import { CheerioParser, CheerioOptions } from './cheerio.js';

export type HtmlLink = {
  href: string;
  rel?: string;
  title?: string;
  attributes?: Dictionary<string>;
  data?: string | Dictionary<string>;
};

export type LinkExtractorOptions = CheerioOptions & {
  ignoreSelfLinkAnchors?: boolean;
  ignoreEmptyHref?: boolean;
};

const linkDefaults: LinkExtractorOptions = {
  ignoreSelfLinkAnchors: true,
  ignoreEmptyHref: true,
};

export const linksFromHtml = (
  r: Resource,
  selector = 'body a',
  customOptions: LinkExtractorOptions = {},
): HtmlLink[] => {
  const options = {
    ...linkDefaults,
    ...customOptions,
  };
  const results: HtmlLink[] = [];

  if (is.nonEmptyString(r.body)) {
    const $ = new CheerioParser(r.body).root;

    $(selector).each((i, element) => {
      const href: string = $(element).attr('href') ?? '';

      if (
        !(href.length === 0 && options.ignoreEmptyHref) &&
        !(href.startsWith('#') && options.ignoreSelfLinkAnchors)
      ) {
        results.push({
          href,
          rel: $(element).attr('rel') ?? '',
          title: $(element).text() ?? '',
          attributes: $(element).attr() as Dictionary<string>,
          data: $(element).data() ?? {},
        });
      }
    });
  }

  return results;
};
