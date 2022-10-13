import { UniqueUrl, IsChildOf } from '../model/index.js';
import { UrlFilters } from '@autogram/url-tools';
import is from '@sindresorhus/is';

interface UrlHierarchyData {
  urls: UniqueUrl[];
  new: UniqueUrl[],
  orphans: UniqueUrl[],
  relationships: IsChildOf<UniqueUrl, UniqueUrl>[]
  hierarchy?: HierarchyItem[],
}

type HierarchyItem = {
  url: UniqueUrl,
  children: HierarchyItem[],
};

export function buildUrlHierarchyData(urls: UniqueUrl[]) {
  const results: UrlHierarchyData = {
    urls: [],
    new: [],
    orphans: [],
    relationships: [],
  };

  // Only examine 'good' URLs
  urls = urls.filter(url => {
    if (url.parsed === undefined) return false;
    return UrlFilters.isWebProtocol(url.parsed);
  });

  // Sort them by our magic 'sortable key' value
  urls.sort((a: UniqueUrl, b: UniqueUrl): number => {
    return a.sortableString.localeCompare(b.sortableString);
  }).reverse();

  for (let url of urls) {
    // Walking up the sortableComponents path until we find a parent should work,
    // but we'll need to figure out how to insert the new URLs without borking
    // the sort order of the entire collection.
    let sortableParent = url.sortableComponents.slice(0, -1).join('/');
    const parent = urls.find(candidate => url.sortableString === sortableParent);

    if (is.undefined(parent)) results.orphans.push(url);

    if (parent) {
      results.relationships.push(
        new IsChildOf({ child: url, parent: parent, context: 'url' })
      );
      results.urls.push(url);
    }
  }

  return results;
}

