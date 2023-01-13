import { Resource } from '../../index.js';
import { getPlainText, HtmlToTextOptions } from './get-plaintext.js';

export type TestedSelector = [(r: Resource) => boolean, string | string[] | HtmlToTextOptions];
export type PageTextOptions = string | string[] | TestedSelector[] | HtmlToTextOptions;

export function getPageText(page: string | Resource, options: PageTextOptions = {}) {
  const markup = (typeof page === 'string') ? page : page.body ?? '';
  const resource = (page instanceof Resource) ? page : undefined;

  if (typeof options === 'string' || isArrayOfStrings(options)) {
    return getPlainText(markup, buildTransformOptions(options));
  } if (isArrayOfTestedSelectors(options)) {
    if (resource) {
      const matchedSelector = options.find(tuple => tuple[0](resource))?.[1] ?? false;
      if (matchedSelector) {
        return getPlainText(markup, buildTransformOptions(matchedSelector));
      }
    } else {
      throw new TypeError('TestedSelector requires Resource');
    }
  } else {
    return getPlainText(markup, options);
  }

  return undefined;
}

function isArrayOfStrings(input: unknown): input is string[] {
  return (Array.isArray(input) && (typeof input.pop() === 'string'));
}

function isArrayOfTestedSelectors(input: unknown): input is TestedSelector[] {
  return (!isArrayOfStrings(input) && Array.isArray(input));
}

function buildTransformOptions(input: string | string[] | HtmlToTextOptions): HtmlToTextOptions {
  if (typeof input === 'string') {
    return { baseElements: { selectors: [input] }};
  } else if (Array.isArray(input)) {
    return { baseElements: { selectors: input }};
  } else {
    return input;
  }
}