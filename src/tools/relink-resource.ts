import {
  Spidergram,
  EnqueueUrlOptions,
  Resource,
  EntityQuery,
  UniqueUrl,
  SpiderContext,
  findUrls,
  saveUrls,
} from '../index.js';
import _ from 'lodash';

/**
 * Rebuild the LinksTo relationships for a given Resource.
 */
export async function relinkResource(
  resource: Resource,
  customOptions: EnqueueUrlOptions = {},
) {
  const sg = await Spidergram.load();
  const options: EnqueueUrlOptions = _.defaultsDeep(
    customOptions,
    Spidergram.config.spider?.urlOptions,
  );
  options.discardExisting = true;

  const uus = await new EntityQuery<UniqueUrl>({
    document: 'uu',
    collection: 'unique_urls',
    subqueries: [
      {
        document: 'rw',
        collection: 'responds_with',
        filters: [
          { path: '_from', eq: 'uu._id', value: 'dynamic' },
          { path: '_to', eq: resource._id },
        ],
      },
    ],
    limit: 1,
  }).run();

  const uu = uus.pop();

  // TODO: Boy howdy is this horrible. Let's change findLinks to use raw HTML instead.
  // While we're at it, we can change saveUrls to accept individual items instead of
  // a context object.

  const fakeContext = {
    resource,
    graph: sg.arango,
    uniqueUrl: uu,
  } as SpiderContext;

  const links = findUrls(fakeContext, options);
  return saveUrls(fakeContext, links, options);
}
