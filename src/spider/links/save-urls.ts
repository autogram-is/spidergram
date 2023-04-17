import is from '@sindresorhus/is';
import arrify from 'arrify';
import { SpiderContext } from '../context.js';
import {
  UniqueUrl,
  LinksTo,
  UrlDiscoveryOptions,
  UrlTools,
  HtmlTools,
  aql,
} from '../../index.js';
import _ from 'lodash';

export async function  saveUrls(
  context: SpiderContext,
  links: HtmlTools.FoundLink | HtmlTools.FoundLink[],
  customOptions: UrlDiscoveryOptions = {},
) {
  const options: UrlDiscoveryOptions = _.defaultsDeep(
    customOptions,
    context.urls,
  );
  const { graph, uniqueUrl, resource } = context;
  const results: {
    uniques: UniqueUrl[];
    links: LinksTo[];
  } = {
    uniques: [],
    links: [],
  };

  for (const link of arrify(links)) {
    const uu = new UniqueUrl({
      url: link.url,
      base: uniqueUrl?.url,
      referer: uniqueUrl?.url,
      depth: uniqueUrl === undefined ? 0 : uniqueUrl.depth + 1,
    });

    // If discardUnparsable is turned on, filter out the bad ones.
    if (options.discardUnparsable && is.undefined(uu.parsed)) {
      continue;
    }

    // If discardNonWeb is turned on, ensure they all have http or https protocols.
    if (
      options.discardNonWeb &&
      !['http:', 'https:'].includes(uu.parsed?.protocol.toLowerCase() ?? '')
    ) {
      continue;
    }

    // IF the URL is parsable, ensure it passes our save filters.
    // Since they only work on parsable URLs, we skip the step and rely on the
    // earlier 'discardUnparsable' flag to weed out undesirables.
    if (uu.parsed) {
      if (
        UrlTools.filterUrl(uu.parsed, options.save, {
          contextUrl: uniqueUrl?.parsed,
        }) === false
      )
        continue;
    }

    // If 'discardExistingLinks' is set, we don't bother including URLs
    // that were already known to the system in the result set; this means
    // they won't be persisted, or enqueued for crawling.
    //
    // On a single continuous crawl this doesn't make much difference, but
    // in situations where a *second crawl* is being conducted on top of an
    // old dataset, it prevents already-visited URLs from being recrawled.
    // This makes it possible to do a crawl with an agressive UrlNormalizer,
    // find cases where it should be loosened, and add the new URL permutations
    // in a second pass.
    //
    // This will be simple once we implement an Arango-based StorageProvider
    // for Crawlee, and ensure that its Request de-duplication stays in sync
    // with Spidergram's UniqueUrl de-duplication.
    if (!options.discardExisting || !(await graph.exists(uu))) {
      results.uniques.push(uu);
    }

    if (resource !== undefined) {
      const lt = new LinksTo({
        from: resource,
        to: uu,
        ...link,
      });
      results.links.push(lt);
    }
  }

  // This is a little complicated; when we're about to save new link_to records,
  // we need to make sure the old ones aren't cluttering things up. This is
  // about as clean as it gets, sadly.
  if (
    resource !== undefined &&
    results.links.length > 0 &&
    options.discardExisting
  ) {
    const deleteLinkTos = aql`
      FOR lt IN links_to
      FILTER lt._from == ${resource.documentId}
      REMOVE lt IN links_to
    `;
    await graph.db.query(deleteLinkTos);
  }

  return graph
    .push(results.uniques, false)
    .then(() => graph.push(results.links))
    .then(() => results.uniques);
}

export async function saveCurrentUrl(context: SpiderContext): Promise<void> {
  const { fromUniqueUrl, referer, depth } = context.request.userData ?? {};

  if (is.boolean(fromUniqueUrl)) {
    context.uniqueUrl = new UniqueUrl({
      url: context.request.url,
      referer: is.string(referer) ? referer : undefined,
      depth: is.number(depth) ? depth : 0,
    });
  } else {
    context.uniqueUrl = new UniqueUrl({ url: context.request.url });
    await context.graph.push(context.uniqueUrl, false);
  }
}
