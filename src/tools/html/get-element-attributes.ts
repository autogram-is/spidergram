export interface ElementAttributes {
  [key: string]: unknown,
  id?: string,
  classes?: string[],
  data?: Record<string, string>
}

/**
 * Given element and its accompanying Cheerio root, return a structured
 * object containing its HTML attributes. The 'class' attribute is
 * changed to an array named 'classes', and any 'data-' attributes are
 * moved to a dictionary in the 'data' property.
 * 
 * The intent is to make generic searching of the extracted data simpler
 * to express in AQL queries, where if/then logic and string transformations
 * are more cumbersome.
 */
export function getElementAttributes($: cheerio.Root, element: cheerio.Element) {
  const results: ElementAttributes = {};
  for (const [name, value] of Object.entries($(element).attr())) {
    if (name === 'class') {
      results.classes = value?.split(',').map(c => c.trim());
    } else if (name.startsWith('data-')) {
      results.data ??= {};
      results.data[name.replace('data-', '')] = value;
    } else {
      results[name] = value;
    }
  }
  return results;
}