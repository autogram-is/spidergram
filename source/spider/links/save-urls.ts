import is from '@sindresorhus/is';
import arrify from 'arrify';
import {CombinedContext} from '../context.js';
import {UniqueUrl, LinksTo} from '../../model/index.js';
import {AnchorTagData, EnqueueUrlOptions, filter, ensureOptions} from './index.js';

export async function save(
  context: CombinedContext,
  links: AnchorTagData | AnchorTagData[],
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await ensureOptions(context, customOptions);
  const {storage, uniqueUrl, resource} = context;
  const results: {
    uniques: Array<UniqueUrl>,
    links: Array<LinksTo>,
  } = {
    uniques: [],
    links: []
  };

  for (const link of arrify(links)) {
    const uu = new UniqueUrl({
      url: link.href,
      base: uniqueUrl?.url,
      referer: uniqueUrl?.url,
      depth: (uniqueUrl === undefined) ? 0 : uniqueUrl.depth + 1,
      normalizer: options.normalizer,
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

    results.uniques.push(uu);

    if (resource !== undefined) {
      const lt = new LinksTo({
        url: uu,
        resource,
        ...link,
      });
      results.links.push(lt);
    }
  }

  return storage.push(results.uniques, false)
    .then(() => storage.push(results.links))
    .then(() => results.uniques)
}

export async function saveCurrentUrl(context: CombinedContext): Promise<void> {
  if ('fromUniqueUrl' in context.request.userData) {
    context.uniqueUrl = new UniqueUrl({
      url: context.request.url,
      normalizer: url => url,
      referer: context.request.headers ? context.request.headers.referer : '',
    });
  } else {
    context.uniqueUrl = new UniqueUrl({url: context.request.url});
    await context.storage.push(context.uniqueUrl, false);
  }
}