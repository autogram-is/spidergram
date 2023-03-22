import { htmlToText, HtmlToTextOptions } from 'html-to-text';
import _ from 'lodash';
import { Spidergram } from '../../index.js';
export { HtmlToTextOptions } from 'html-to-text';

/**
 * Convert HTML markup into plain text
 *
 * @param html - Markup of a complete or partial web page
 * @param options - Flags to control HTML traversal and formatting
 * @param options.wordwrap - Set the line length or disable wrapping entirely with 'false'
 * @param options.baseElements.selectors - An array of CSS selectors to identify the page's primary content.
 * @param options.limits.maxBaseElements - Increase to allow multiple primary content elements
 */
export function getPlaintext(
  input: string | cheerio.Root,
  options?: HtmlToTextOptions,
): string {
  const html = typeof input === 'string' ? input : input.html();
  return htmlToText(
    html,
    _.defaultsDeep(options, Spidergram.config.htmlToText),
  ).trim();
}

/**
 * Convert HTML markup into the textual content that would likely be read
 * by a screen reader. Primarily intended for short runs of text whose
 * visible and readable representations may differ dramatically.
 */
export function getReadableText(
  input: string | cheerio.Root,
  options?: HtmlToTextOptions,
): string {
  const opt = _.defaultsDeep(options, readableTextOptions);
  return getPlaintext(input, opt).trim();
}

/**
 * Convert HTML markup into its visible textual content. Primarily intended for short
 * runs of text whose visible and readable representations may differ dramatically.
 */
export function getVisibleText(
  input: string | cheerio.Root,
  options?: HtmlToTextOptions,
): string {
  const opt = _.defaultsDeep(options, visibleTextOptions);
  return getPlaintext(input, opt).trim();
}

export const readableTextOptions: HtmlToTextOptions = {
  selectors: [
    { selector: 'img', format: 'readableImage' },
    { selector: 'a', options: { ignoreHref: true } }
  ],
  formatters: {
    readableImage: (el, walk, builder) => {
      const alt = el.attribs.alt ?.toString().trim() ?? '';
      const src = el.attribs.src ?.toString().trim() ?? '';
      const text = (alt.trim().length) ? alt : src;
      builder.addInline(text + ' ', { noWordTransform: true });
    }
  }
}

export const visibleTextOptions: HtmlToTextOptions = {
  selectors: [
    { selector: 'img', format: 'skip' },
    { selector: 'a', options: { ignoreHref: true } }
  ],
}
