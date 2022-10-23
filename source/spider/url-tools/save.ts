import is from '@sindresorhus/is';
import {CombinedContext} from '../context.js';
import {UniqueUrl, LinksTo} from '../../model/index.js';
import {HtmlLink, EnqueueUrlOptions, buildEnqueueUrlOptions} from './index.js';

export async function save(
  links: HtmlLink | HtmlLink[],
  context: CombinedContext,
  customOptions: Partial<EnqueueUrlOptions> = {},
) {
  const input = is.array(links) ? links : [links];
  const {storage, uniqueUrl, resource} = context;
  const options = await buildEnqueueUrlOptions(context, customOptions);

  return Promise.all(input.map(async link => {
    const uu = new UniqueUrl({
      url: link.href,
      base: uniqueUrl?.url,
      referer: uniqueUrl?.url,
      depth: (uniqueUrl !== undefined) ? uniqueUrl.depth + 1 : 0,
    });
  
    // If it's parsable and the parsed URL passes the global
    // 'save this URL' filter, OR `skipUnparsableLinks` is set in
    // the options, we plow on forward. Otherwise, we'll return
    // the UniqueUrl unpersisted.
    if (uu.parsable || !options.skipUnparsableLinks) {
      await storage.push(uu, false);
  
      // If there's no active Resource, we don't bother creating
      // the LinksTo. As with `saveResource` we'll probably want
      // to provide some way to override the behavior even when
      // the Resource is present.
      if (resource !== undefined) {
        const lt = new LinksTo({
          url: uu,
          resource,
          ...link,
        });
        await storage.push(lt);
      }
    }
    return uu;
  }));
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
