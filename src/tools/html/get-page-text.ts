import { Resource } from '../../index.js';
import { convertHtmlToText, PlainTextOptions } from './convert-html-to-text.js';
import _ from 'lodash';


/**
 * Contains a predicate function and HTML-to-plaintext conversion options for
 * Resources that match the predicate.
 */
export type SelectorForResource = {
  /**
   * A predicate function that accepts a {@link Resource} and returns a boolean.
   */
  test: (r: Resource) => boolean,


  /**
   * One or more CSS selectors used to find the page's primary content.
   * 
   * Alternatively, a complete {@link PlainTextOptions} object can be supplied,
   * with full HTML-to-Text conversion options including DOM selectors.
   */
  selector: string | string[] | PlainTextOptions
};

/**
 * Options to control the extraction of a page's primary content and its
 * conversion to plaintext
 */
export interface PageTextOptions {
  /**
   * Raw HTML to be converted to plaintext; if the `resource` option is specified,
   * this option is ignored.
   */
  markup?: string,

  /**
   * A {@link Resource | resource entity} whose body primary content should be
   * converted to plaintext.
   */
  resource?: Resource;
  
  /**
   * One or more CSS selectors used to find the page's primary content.
   * 
   * Alternatively, a complete {@link PlainTextOptions} object can be supplied,
   * with full HTML-to-Text conversion options including DOM selectors.
   */
  selectors?: string | string[] | PlainTextOptions;
  
  /**
   * An array of {@link SelectorForResource | predicate / selector pairs} that
   * can be used to apply different selectors to different pages, depending on 
   * the properties of the {@link Resource} object in question.
   * 
   * If this property is set, the `selectors` property is ignored. The order
   * of the {@link SelectorForResource} objects matters, as the first one matched
   * will be treated as the 'correct' selector.
   */
  matchedSelectors?: SelectorForResource[];
  
  /**
   * Allow multiple page elements to be treated as the page's 'primary content'.
   *
   * @defaultValue `false`
   */
  allowMultipleContentElements?: boolean;
  
  /**
   * Fall back to the full text of the page if the specified selectors have no
   * matches. This will include headers, footers, navigation elements, etc.
   *
   * @defaultValue `false`
   */
  defaultToFullDocument?: boolean;
}

const defaults: PageTextOptions = {
  allowMultipleContentElements: false,
  defaultToFullDocument: true,
}

/**
 * Convers a web page (in the form of raw HTML or a {@link Resource} object)
 * into plain text.
 */
export function getPageText(input: PageTextOptions) {
  const options: PageTextOptions = _.defaultsDeep(input, defaults);
  const markup = options.markup ?? options.resource?.body ?? false;
  const resource = options.resource;

  if (!markup) {
    throw new Error('No markup or resource supplied');
  }

  if (options.matchedSelectors) {
    if (resource) {
      const selector = options.matchedSelectors.find(match => match.test(resource))?.selector ?? false;
      if (selector) {
        return convertHtmlToText(markup, buildFullOptions(selector, options));
      }
    } else {
      throw new Error('MatchedSelectors supplied without resource');
    }
  } else if (options.selectors) {
    return convertHtmlToText(markup, buildFullOptions(options.selectors, options));
  }

  return convertHtmlToText(markup, buildFullOptions(undefined, options));
}

function buildFullOptions(input: string | string[] | PlainTextOptions | undefined, options: PageTextOptions): PlainTextOptions {
  let output: PlainTextOptions = {};

  if (typeof input === 'string') {
    _.set(output, 'baseElements.selectors', [input]);
  } else if (Array.isArray(input)) {
    _.set(output, 'baseElements.selectors', input);
  } else if (input !== undefined) {
    output = input;
  }

  if (options.allowMultipleContentElements === false) _.set(output, 'limits.maxBaseElements', 1);
  if (options.defaultToFullDocument === false) _.set(output, 'baseElements.returnDomByDefault', false)

  return output;
}