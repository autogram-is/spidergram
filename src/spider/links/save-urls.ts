import is from '@sindresorhus/is';
import arrify from 'arrify';
import {SpiderContext} from '../context.js';
import {UniqueUrl, LinksTo} from '../../model/index.js';
import {AnchorTagData, EnqueueUrlOptions, filter, ensureOptions} from './index.js';

export async function save(
  context: SpiderContext,
  links: AnchorTagData | AnchorTagData[],
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await ensureOptions(context, customOptions);
  const {graph, uniqueUrl, resource} = context;
  const results: {
    uniques: UniqueUrl[];
    links: LinksTo[];
  } = {
    uniques: [],
    links: [],
  };

  for (const link of arrify(links)) {
    const uu = new UniqueUrl({
      url: link.href,
      base: uniqueUrl?.url,
      referer: uniqueUrl?.url,
      depth: (uniqueUrl === undefined) ? 0 : uniqueUrl.depth + 1,
    });

    // Run each URL through a few gauntlets
    if (options.skipUnparsableLinks && is.undefined(uu.parsed)) {
      continue;
    }

    if (options.skipNonWebLinks && !['https:', 'https:'].includes(uu.parsed!.protocol.toLowerCase())) {
      continue;
    }

    if (!filter(context, uu, options.save)) {
      continue;
    }

    // If 'discardExistingLinks' is set, we don't bother including URLs
    // that were already known to the system in the result set; this means
    // they won't be persisted, or enqueued for crawling.
    //
    // On a single continuous crawl this doesn't make much difference, but
    // in situations where a *second crawl* is being conducted on top of an
    // old dataset, it prevents already-visited URL from being recrawled.
    // This makes it possible to do a crawl with an agressive UrlNormalizer,
    // find cases where it should be loosened, and add the new URL permutations
    // in a second pass.
    //
    // This will be simple once we implement an Arango-based StorageProvider
    // for Crawlee, and ensure that its Request de-duplication stays in sync
    // with Spidergram's UniqueUrl de-duplication.
    if (!options.discardExistingLinks || !(await graph.exists(uu))) {
      results.uniques.push(uu);
    }

    // This chunk in particular is tricky: we insert LinksTo records "blind"
    // because the same link can exist in a resource multiple times. That means
    // running a crawl that reprocesses a given page will insert duplicate links
    // for that page, with no easy way to identify them.
    // 
    // There's no perfect solution for this, other than clearing out the existing
    // links for a Resource whenever we add a new set. We'll look into that.
    if (resource !== undefined) {
      const lt = new LinksTo({
        url: uu,
        resource,
        ...link,
      });
      results.links.push(lt);
    }
  }

  return graph.push(results.uniques, false)
    .then(async () => graph.push(results.links))
    .then(() => results.uniques);
}

export async function saveCurrentUrl(context: SpiderContext): Promise<void> {
  const { fromUniqueUrl, referer } = context.request.userData ?? {};

  if (is.boolean(fromUniqueUrl)) {
    context.uniqueUrl = new UniqueUrl({
      url: context.request.url,
      normalizer: url => url,
      referer: is.string(referer) ? referer : undefined
    });
  } else {
    context.uniqueUrl = new UniqueUrl({url: context.request.url});
    await context.graph.push(context.uniqueUrl, false);
  }
}
