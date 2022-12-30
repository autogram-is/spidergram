import is from '@sindresorhus/is';
import arrify from 'arrify';
import { SpiderContext } from '../context.js';
import { UniqueUrl, LinksTo } from '../../model/index.js';
import { EnqueueUrlOptions, filter } from './index.js';
import { HtmlTools, NormalizedUrl, aql } from '../../index.js';
import _ from 'lodash';

export async function save(
  context: SpiderContext,
  links: HtmlTools.FoundLink | HtmlTools.FoundLink[],
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options: EnqueueUrlOptions = _.defaultsDeep(
    customOptions,
    context.urlOptions,
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
      normalizer: options.normalizer ?? NormalizedUrl.normalizer
    });
    if (options.requestLabel) uu.requestLabel = options.requestLabel;

    // Run each URL through a few gauntlets
    if (options.discardUnparsableLinks && is.undefined(uu.parsed)) {
      continue;
    }

    if (
      options.discardNonWebLinks &&
      !['http:', 'https:'].includes(uu.parsed?.protocol.toLowerCase() ?? '')
    ) {
      continue;
    }

    if (!filter(context, uu, options.save)) {
      continue;
    }

    // This approach is pretty inefficient, but it'll do for new.
    // If the 'always check' flag is set, and we're processing a top-level URL,
    // also save a version of the URL with sitemap.xml appended. We might
    // want to handle this in a parallel track to ensure that any newly
    // spotted domain gets both sitemap and robots.txt analysis if enabled, even
    // if the link to it isn't the top level index.
    if (is.emptyArray(uu.parsed?.path)) {
      if (options.checkRobots) {
        const ru = new NormalizedUrl(uu.url);
        ru.pathname = 'robots.txt';
        const ruu = new UniqueUrl({
          url: ru,
          requestLabel: 'robotstxt',
          forefrontRequest: true,
        });
        if (!options.discardExistingLinks || !(await graph.exists(ruu))) {
          results.uniques.push(ruu);
        }
      } else if (options.checkSitemaps) {
        const nu = new NormalizedUrl(uu.url);
        nu.pathname = 'sitemap.xml';
        const suu = new UniqueUrl({
          url: nu,
          requestLabel: 'sitemap',
          forefrontRequest: true,
        });
        if (!options.discardExistingLinks || !(await graph.exists(suu))) {
          results.uniques.push(suu);
        }
      }
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

    if (resource !== undefined) {
      const lt = new LinksTo({
        from: resource,
        to: uu,
        label: options.linkLabel,
        ...link,
      });
      results.links.push(lt);
    }
  }

  // This is a little complicated; when we're about to save new link_to records,
  // we need to make sure the old ones aren't cluttering things up. This is
  // about as clean as it gets, sadly.
  if (resource !== undefined && results.links.length > 0) {
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
      normalizer: url => url,
      referer: is.string(referer) ? referer : undefined,
      depth: is.number(depth) ? depth : 0,
    });
  } else {
    context.uniqueUrl = new UniqueUrl({ url: context.request.url });
    await context.graph.push(context.uniqueUrl, false);
  }
}
