import is from '@sindresorhus/is';
import { SpiderContext } from '../context.js';
import { EnqueueUrlOptions, PageLinkRegion } from './index.js';
import { HtmlTools } from '../../index.js';
import _ from 'lodash';
import { getCheerio } from '../../tools/html/get-cheerio.js';
import { FoundLink } from '../../tools/html/find-links.js';
import { getHtmlRegions } from '../../tools/html/get-html-regions.js';

export function findUrls(
  context: SpiderContext,
  customOptions?: EnqueueUrlOptions,
) {
  const options: EnqueueUrlOptions = _.defaultsDeep(
    customOptions,
    context.urlOptions,
  );
  const { selectors, discardlocalAnchors, discardEmpty } = options;

  // We're doing this song and dance temporarily, to avoid altering the
  // underlying DOM before it's saved.
  const { resource } = context;
  const html = resource?.body ?? '';
  const $ = getCheerio(html);

  const results: HtmlTools.FoundLink[] = [];

  if (options.regions === undefined) {
    for (const link of HtmlTools.findLinks($, selectors)) {
      if (!discardLink(link, discardlocalAnchors, discardEmpty)) {
        results.push(link);
      }
    }
  } else {
    const regions = getHtmlRegions(html, options.regions);
    for (const [region, regionHtml] of Object.entries(regions)) {
      // Grab or simulate the definition for this particular region;
      // does it have additional link options?
      let linkOptions: PageLinkRegion | undefined = undefined;
      if (
        typeof options.regions !== 'string' &&
        !Array.isArray(options.regions)
      ) {
        if (Object.keys(options.regions).includes(region)) {
          const definition = options.regions[region];
          if (typeof definition !== 'string') linkOptions = definition;
        }
      }

      // Find the links!
      for (const link of HtmlTools.findLinks(
        regionHtml,
        linkOptions?.linkSelectors ?? options.selectors,
      )) {
        if (!discardLink(link, discardlocalAnchors, discardEmpty)) {
          link.region = region;
          link.label = linkOptions?.label;
          link.handler = linkOptions?.handler ?? options.handler;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const {
            selector,
            save,
            enqueue,
            linkSelectors,
            ...linkOptionsToSave
          } = linkOptions ?? {};
          results.push({ ...link, ...linkOptionsToSave });
        }
      }
    }
  }

  return results;
}

function discardLink(
  link: FoundLink,
  discardLocalAnchors = true,
  discardEmpty = true,
): boolean {
  if (discardEmpty && is.undefined(link.url)) return true;
  if (discardEmpty && is.emptyStringOrWhitespace(link.url)) return true;
  if (discardLocalAnchors && link.url?.startsWith('#')) return true;
  return false;
}
