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
  html: string,
  options?: HtmlToTextOptions,
): string {
  return htmlToText(html, _.defaultsDeep(options, Spidergram.config.htmlToText));
}
