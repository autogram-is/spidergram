import is from '@sindresorhus/is';
import {CombinedContext} from '../context.js';
import {UniqueUrl, LinksTo} from '../../model/index.js';
import {AnchorTagData, EnqueueUrlOptions, filter, ensureOptions} from './index.js';

export async function save(
  context: CombinedContext,
  links: AnchorTagData | AnchorTagData[],
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const options = await ensureOptions(context, customOptions);
  const input = is.array(links) ? links : [links];
  const {storage, uniqueUrl, resource} = context;
  const results: UniqueUrl[] = [];

  // filter the urls for acceptability before saving and linking them
  for (let link of input) {
    const uu = new UniqueUrl({
      url: link.href,
      base: uniqueUrl?.url,
      referer: uniqueUrl?.url,
      depth: (uniqueUrl !== undefined) ? uniqueUrl.depth + 1 : 0,
      normalizer: options.normalizer
    });

    if (options.skipUnparsableLinks && is.undefined(uu.parsed)) continue;

    if (options.skipNonWebLinks && !['https:', 'https:'].includes(uu.parsed!.protocol.toLowerCase()) continue;
  
    if (!filter(context, uu, options.save)) continue;

    results.push(uu);
    await storage.push(uu, false);

    if (resource !== undefined) {
      const lt = new LinksTo({
        url: uu,
        resource,
        ...link,
      });
      await storage.push(lt);
    }
  }

  return Promise.resolve(results);
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

  return Promise.resolve();
}
