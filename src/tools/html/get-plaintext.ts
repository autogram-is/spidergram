import { htmlToText, HtmlToTextOptions } from 'html-to-text';

export function getPlainText(html: string, options?: HtmlToTextOptions): string {
  return htmlToText(html, options);
}