import { htmlToText, HtmlToTextOptions } from 'html-to-text';
import _ from 'lodash';

export function getPlainText(
  html: string,
  options?: HtmlToTextOptions,
): string {
  const defaults = {
    wordwrap: false,
    limits: { maxBaseElements: 1 },
    selectors: [{ selector: 'a', options: { ignoreHref: true } }],
  };

  return htmlToText(html, _.defaultsDeep(options, defaults));
}
