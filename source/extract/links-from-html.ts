import is from '@sindresorhus/is';
import { Resource } from '../graph';
import { Dictionary } from '@autogram/autograph';
import { CheerioParser, CheerioOptions } from './cheerio.js';

export type HtmlLink = {
  href: string,
  rel?: string,
  title?: string,
  attributes?: Dictionary<string>,
  data?: string,
}

export type LinkExtractorOptions = CheerioOptions & {
  ignoreSelfLinkAnchors?: boolean,
  ignoreEmptyHref?: boolean,
}

const linkDefaults:LinkExtractorOptions = {
  ignoreSelfLinkAnchors: true,
  ignoreEmptyHref: true,
}

export const linksFromHtml = (
  r: Resource,
  selector: string = 'body a',
  customOptions: LinkExtractorOptions = {}
): HtmlLink[] => {
  const options = {
    ...linkDefaults,
    ...customOptions
  };
  const results:HtmlLink[] = [];

  if (is.nonEmptyString(r.body)) {
    const $ = new CheerioParser(r.body).root;

    $(selector).each((i, e) => {
      const href: string = $(e).attr('href') ?? '';

      if (!(href.length === 0 && options.ignoreEmptyHref)) {
        if (!(href.startsWith('#') && options.ignoreSelfLinkAnchors)) {
          results.push({
            href: href,
            rel: $(e).attr('rel') ?? '',
            title: $(e).text() ?? '',
            attributes: $(e).attr() as Dictionary<string>,
            data: $(e).data() ?? {},
          });  
        }
      };
    });
  };
  return results;
};
