import _ from 'lodash';
import { getCheerio } from './get-cheerio.js';

export type PageRegion = Record<string, unknown> & {
  selector: string
}

/**
 * Default options for the
 */
export interface RegionOptions extends Record<string, unknown> {
  removeFoundElements?: boolean;
  fallbackRegion?: string | false;
}

const defaults: RegionOptions = {
  removeFoundElements: true,
  fallbackRegion: 'other'
}

/**
 * Chop an HTML fragment into smaller chunks based on named selectors, optionally
 * preserving the remaining portions of the document.
 *
 * Selectors are processed in the order they appear in the dictionary, and by default 
 * the DOM elements they match are removed from the HTML so overlapping selectors won't
 * produce duplicate markup. The downside is that it can produce discontiguous markup,
 * but that's not a problem for things like link and component identification.
 */
export function getHtmlRegions(
  input: string,
  regions: string | string[] | Record<string, string | PageRegion>,
  options: RegionOptions = {}
): Record<string, string> {
  const opt: RegionOptions = _.defaultsDeep(options, defaults);
  const regionDefinitions: Record<string, PageRegion> = {};
  const output: Record<string, string> = {};
  const $ = getCheerio(input);

  // Translate our possible incoming values into internally valid
  // region definitions. In the future we might want to use a 'selector to
  // sane key' mapper to keep things from being weird.
  if (typeof regions === 'string') {
    regionDefinitions[regions] = { selector: regions };
  } else if (Array.isArray(regions)) {
    for (const r of regions) {
      regionDefinitions[r] = { selector: r };
    }
  } else {
    for (const [key, value] of Object.entries(regions)) {
      if (typeof value === 'string') {
        regionDefinitions[key] = { selector: value };
      } else {
        regionDefinitions[key] = value;
      }
    }
  }
  
  // Fairly straightforward loop that grabs matching chunks from the full HTML,
  // concatenates their HTML, and slams it into the region bucket. Optionally,
  // it then deletes all the found elements from the document and moves on to
  // the next region.
  for (const [reg, def] of Object.entries(regionDefinitions)) {
    const subset = $(def.selector);
    if (subset.length) {
      output[reg] = subset
        .toArray()
        .map(e => $.html(e))
        .join();
      if (opt.removeFoundElements) subset.remove();
    }
  }

  // If the fallback region is enabled and hasn't been output already,
  // fill it with the turkey carcass of HTML that's left over after
  // extracting our regions.
  if (opt.fallbackRegion && output[opt.fallbackRegion] === undefined) {
    output[opt.fallbackRegion] = $.html();
  }
  return output;
}
