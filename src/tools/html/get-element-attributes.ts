import _ from 'lodash';

/**
 * Properties and attributes of a given DOM element.
 */
export interface ElementAttributes {
  [key: string]: unknown,
  id?: string,
  classes?: string[],
  data?: Record<string, string>
  content?: string
}

type Options = {
  classIsArray?: boolean,
  contentIsAttribute?: boolean,
  dataIsDictionary?: boolean,
  dropEmptyAttributes?: boolean,
}

const defaults: Options = {
  classIsArray: true,
  contentIsAttribute: false,
  dataIsDictionary: true,
  dropEmptyAttributes: true,
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
 * @param element - A Cheerio node, usually the result of a query run on a larger document
 * @param options.classIsArray - Convert the 'class' attribute into a 'classes' array.
 * @param options.contentIsAttribute - Treat the element's internal HTML as a 'content' pseudo-attribute
 * @param options.dataIsDictionary - Group 'data-' attributes into a dictionary for easier traversal
 * @param options.dropEmptyAttributes - Ignore empty attribute values, even ones like 'disabled'
 */
export function getElementAttributes(element: cheerio.Cheerio, customOptions: Options = {}) {
  const options = _.defaultsDeep(customOptions, defaults);
  const results: ElementAttributes = {};

  for (const [name, value] of Object.entries(element.first().attr())) {
    if (name === 'class') {
      results.classes = value?.split(',').map(c => c.trim());
    } else if (name.startsWith('data-')) {
      const data = valueToFlag(value, options.dropEmptyAttributes);
      if (data) {
        results.data ??= {};
        results.data[name.replace('data-', '')] = data;
      }
    } else {
      const data = valueToFlag(value, options.dropEmptyAttributes);
      if (data) results[name] = data;
    }
  }

  if (options.contentIsAttribute) {
    const content = element.first().html()?.trim() ?? '';
    if (content.length > 0) {
      results.content = content;
    }
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