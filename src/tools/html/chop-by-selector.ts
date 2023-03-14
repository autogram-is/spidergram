import { RegionSelectors } from '../../spider/index.js';
import { getCheerio } from './get-cheerio.js';

/**
 * Chop an HTML fragment into smaller chunks based on named selectors, optionally
 * preserving the remaining portions of the document.
 *
 * Selectors are processed in the order they appear in the dictionary, and the DOM
 * elements they match are removed from the HTML so subsequent selectors won't match
 * them a second time. This ensures the resulting output will contain won't contain
 * duplicate elements, but also means the output may be discontiguous.
 *
 * @param input A full HTML document or fragment.
 * @param selectors A key/value pair where each value is a CSS selector, and each key is the selector's name or label.
 */
export function chopBySelector(
  input: string,
  selectors: RegionSelectors,
  remainder: string | false = 'no_region_matched',
): Record<string, string> {
  const results: Record<string, string> = {};
  const $ = getCheerio(input);

  if (typeof selectors === 'string') {
    selectors = { main: selectors };
  }
  
  for (const [key, value] of Object.entries(selectors)) {
    const selector = (typeof value === 'string' ? value : value?.selector as string) ?? '';
    const subset = $(selector);
    if (subset.length) {
      results[key] = subset
        .toArray()
        .map(e => $.html(e))
        .join();
      subset.remove();
    }
  }
  if (remainder) results[remainder] = $.html();
  return results;
}
