import { TextTools, Resource } from '../../index.js';
import { getPlaintext, HtmlToTextOptions } from './get-plaintext.js';
import { Spidergram } from '../../config/spidergram.js';
import _ from 'lodash';
import is from '@sindresorhus/is';
import { getCheerio } from './get-cheerio.js';
import { getMarkup } from './get-markup.js';

export interface PageContent extends Record<string, unknown> {
  text?: string;
  readability?: TextTools.ReadabilityScore;
}

export type PageContentExtractor = (
  input: string | cheerio.Root | Resource,
  options: PageContentOptions,
) => Promise<PageContent>;

/**
 * Options to control the extraction of core content from an HTML page
 */
export interface PageContentOptions {
  /**
   * Generate a plaintext version of the HTML.
   *
   * @remarks
   * Other options like {@link PageContentOptions.selector | selector},
   * {@link PageContentOptions.allowMultipleContentElements | allowMultipleContentElements}, and
   * {@link PageContentOptions.defaultToFullDocument | defaultToFullDocument} will override the
   * equivalent values in this configuration object.
   *
   * @see {@link https://github.com/html-to-text/node-html-to-text/tree/master/packages/html-to-text | Html-To-Text docs} for details
   */
  htmlToText?: HtmlToTextOptions;

  /**
   * One or more CSS selectors used to find the markup's primary content.
   *
   * @remarks
   * This option is prefered over {@link HtmlToTextOptions.baseElements.selectors | baseElements.selectors}
   * on the {@link PageContentOptions.htmlToText | text} option. HtmlToText is good, but its support for
   * some selectors is limited and can generate surprising results. Whenever possible, use this option instead.
   */
  selector?: string | string[];

  /**
   * Allow multiple page elements to be treated as the markup's 'primary content'.
   *
   * @remarks
   * Setting this to `true`  is equivalent to setting {@link HtmlToTextOptions.limits.maxBaseElements | limits.maxBaseElements}
   * on the {@link PageContentOptions.htmlToText | text} option to `1`.
   *
   * @defaultValue `false`
   */
  allowMultipleContentElements?: boolean;

  /**
   * Fall back to the full text of the page if the specified selectors have no
   * matches. This will include headers, footers, navigation elements, etc.
   *
   * @remarks
   * Setting this to `true`  is equivalent to setting {@link HtmlToTextOptions.baseElements.returnDomByDefault | baseElements.returnDomByDefault}
   * on the {@link PageContentOptions.htmlToText | text} option.
   *
   * @defaultValue `false`
   */
  defaultToFullDocument?: boolean;

  /**
   * Trim surrounding whitespace around the content's plaintext.
   *
   * @defaultValue `true`
   */
  trim?: boolean;

  /**
   * Calculate the readability score for the page's main content.
   *
   * @defaultValue `true`
   */
  readability?: boolean | TextTools.ReadabilityScoreOptions;
}

/**
 * Extract the core content of an HTML page and return its plaintext, with
 * optional configuration options.
 */
export async function getPageContent(
  input: string | cheerio.Root | Resource,
  customOptions: PageContentOptions = {},
) {
  if (is.function_(Spidergram.config.getPageContentFn)) {
    return Spidergram.config.getPageContentFn(input, customOptions);
  } else {
    return _getPageContent(input, customOptions);
  }
}

// Internal function that actually does the heavy lifting.
async function _getPageContent(
  input: string | cheerio.Root | Resource,
  customOptions: PageContentOptions = {},
) {
  const options: PageContentOptions = _.defaultsDeep(
    customOptions,
    Spidergram.config.pageContent,
  );
  const htmlOptions: HtmlToTextOptions =
    options.htmlToText ?? Spidergram.config.htmlToText ?? {};
  let markup = '';

  if (options.selector) {
    const selectors = Array.isArray(options.selector)
      ? options.selector
      : [options.selector];
    const $ = getCheerio(input);
    for (const s of selectors) {
      markup = $(s).html() ?? '';
      if (markup.length > 0) continue;
    }
  } else {
    markup = getMarkup(input);
  }

  let results: PageContent | undefined;

  if (options.allowMultipleContentElements === false) {
    _.set(htmlOptions, 'limits.maxBaseElements', 1);
  }

  if (options.defaultToFullDocument === false) {
    _.set(htmlOptions, 'baseElements.returnDomByDefault', false);
  }

  let plainText = getPlaintext(markup, htmlOptions);
  if (options.trim) plainText = plainText.trim();

  if (plainText.length > 0) {
    results = {};
    results.text = plainText;

    if (options.readability === true) {
      results.readability = TextTools.getReadabilityScore(results.text);
    } else if (options.readability !== false) {
      results.readability = TextTools.getReadabilityScore(
        results.text,
        options.readability,
      );
    }
  }

  return Promise.resolve(results);
}
