import _ from 'lodash';
import { HtmlTools } from '../index.js';

/**
 * Properties and attributes of a given DOM element.
 */
export interface ElementData {
  [key: string]: unknown,
  tagName?: string
  id?: string,
  classes?: string[],
  data?: Record<string, string>
  content?: string
}

/**
 * Flags and settings for extraction of data from HTML elements.
 */
export interface ElementDataOptions {
  /**
   * Add the name of the element's HTML tag to the returned data.
   *
   * @defaultValue `false`
   */
  includeTagName?: boolean,

  /**
   * Convert the 'class' attribute into a 'classes' array.
   *
   * @defaultValue `true`
   */
  classIsArray?: boolean,

  /**
   * Treat the element's internal HTML as a `content` pseudo-attribute.
   *
   * @defaultValue `false`
   */
  contentIsAttribute?: boolean,

  /**
   * Group `data-` attributes into a dictionary for easier traversal
   *
   * @defaultValue `true`
   */
  dataIsDictionary?: boolean,

  /**
   * Ignore empty attribute values, even ones like `disabled`.
   *
   * @defaultValue `true`
   */
  dropEmptyAttributes?: boolean,

  /**
   * A dictionary of values to mix into the return data.
   *
   * @defaultValue `{}`
   */
  userData?: Record<string, unknown>,

  /**
   * A post-processing function that modifies the ElementData before it's returned.
   * 
   * This can be used to transform attributes/classes/data on the element, or to
   * extract information on its nested sub-elements.
   *
   * @defaultValue `undefined`
   */
  extractor?: ($: cheerio.Cheerio, data: ElementData) => ElementData,
}

const defaults: ElementDataOptions = {
  classIsArray: true,
  contentIsAttribute: false,
  dataIsDictionary: true,
  dropEmptyAttributes: true,
  includeTagName: false,
  userData: {},
}

/**
 * Given a Cheerio object, return a dictionary of HTML attributes for the
 * first element.
 * 
 * @remarks
 * The 'raw' attributes of the element are modified to make downstream
 * processing simpler. In particular:
 * 
 * - The 'class' attribute is changed to an array named 'classes', and any
 *   whitespace surrounding individual classnames is stripped.
 * - 'data-' attributes are moved to a dictionary in the 'data' property.
 * 
 * @param input - An HTML fragment or a Cheerio node, usually the result of a query run on a larger document
 * @param options - An {ElementDataOptions} object with flags and settings to control formatting of the returned data.
 */
export function findElementData(input: cheerio.Cheerio | string, customOptions: ElementDataOptions = {}) {
  const $ = typeof input === 'string' ? HtmlTools.getCheerio(input).root() : input;
  const options: ElementDataOptions = _.defaultsDeep(customOptions, defaults);
  const results: ElementData = { ...options.userData };

  if (options.includeTagName) {
    results.tagName = $.get(0).tagName.toString();
  }

  for (const [name, value] of Object.entries($.first().attr())) {
    if (name === 'class') {
      delete results.class;
      results.classes = value?.replace(/\s+/, ' ').split(' ').map(c => c.trim());
    } else if (name.startsWith('data-')) {
      const data = valueToFlag(value, options.dropEmptyAttributes);
      if (data) {
        results.data ??= {};
        results.data[name.replace('data-', '')] = data;
        delete results[name];
      }
    } else {
      const data = valueToFlag(value, options.dropEmptyAttributes);
      if (data) results[name] = data;
    }
  }

  if (options.contentIsAttribute) {
    const content = $.first().html()?.trim() ?? '';
    if (content.length > 0) {
      results.content = content;
    }
  }

  if (options.extractor !== undefined) {
    options.extractor($, results);
  }

  return results;
}

function valueToFlag(input: unknown, dropEmptyAttributes = true) {
  let data = '';
  if (input !== undefined && input !== null) {
    data = input.toString().trim();
  }
  return (data.length > 0) ? data : (dropEmptyAttributes ? undefined : data);
}