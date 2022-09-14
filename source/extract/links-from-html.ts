import is from '@sindresorhus/is';
import { Dictionary } from '@autogram/autograph';
import { Resource } from '../graph/index.js';
import { CheerioParser, CheerioOptions } from './cheerio.js';

export type HtmlLink = {
  href: string;
  context?: string;
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
  selectors: string | Dictionary<string> = 'body a',
  customOptions: LinkExtractorOptions = {},
): HtmlLink[] => {
  const options = {
    ...linkDefaults,
    ...customOptions,
  };
  const results: HtmlLink[] = [];
  if (typeof selectors === 'string') {
    selectors = { default: selectors };
  }

  if (is.nonEmptyString(r.body)) {
    const $ = new CheerioParser(r.body).root;

    for (const key in selectors) {
      $(selectors[key]).each((i, element) => {
        const href: string = $(element).attr('href') ?? '';

        if (
          !(href.length === 0 && options.ignoreEmptyHref) &&
          !(href.startsWith('#') && options.ignoreSelfLinkAnchors)
        ) {
          results.push({
            href,
            context: key,
            rel: $(element).attr('rel') ?? '',
            title: $(element).text() ?? '',
            attributes: $(element).attr() as Dictionary<string>,
            data: $(element).data() ?? {},
          });
        }
      });
    }
  }

  return results;
};
