import { UniqueUrl, IsChildOf } from '../model/index.js';
import { UrlFilters } from '@autogram/url-tools';
import { ArangoStore } from '../arango-store.js';
import { GeneratedAqlQuery } from 'arangojs/aql';
import { aql } from 'arangojs';
import is from '@sindresorhus/is';
import { JsonObject } from '../types.js';

interface UrlHierarchyData {
  urls: UniqueUrl[];
  new: UniqueUrl[],
  orphans: UniqueUrl[],
  relationships: IsChildOf<UniqueUrl, UniqueUrl>[]
  hierarchy?: UrlHierarchyItem[],
}

type UrlHierarchyItem = {
  url: UniqueUrl,
  children: UrlHierarchyItem[],
};

export class UrlHierarchy implements UrlHierarchyData {
  urls: UniqueUrl[] = [];
  new: UniqueUrl[] = [];
  orphans: UniqueUrl[] = [];
  relationships: IsChildOf[] = [];
  hierarchy: UrlHierarchyItem[] = [];
  
  constructor(protected readonly storage: ArangoStore) {}

  async loadUrls(filter?: GeneratedAqlQuery) {
    const cursor = await this.storage.query(
      aql`FOR uu in unique_urls ${filter} return uu`
    )
    this.urls = await cursor.map(result => {
      return UniqueUrl.fromJSON(result as JsonObject)
    });
  }

  // Sort them by our magic 'sortable key' value; this ensures that
  // iterating through them in order will always produce the most distant
  // leaf nodes possible.
  protected sortUrls() {
    this.urls.sort((a: UniqueUrl, b: UniqueUrl): number => {
      return a.sortableString.localeCompare(b.sortableString);
    }).reverse();
  }

  async buildHierarchy() {
    // Ensure we're only looking at 'good' URLs
    let urls = this.urls.filter(url => {
      if (url.parsed === undefined) return false;
      return UrlFilters.isWebProtocol(url.parsed);
    });
  
    this.sortUrls();
  
    for (let url of urls) {
      const parent = this.findParent(url);
  
      if (is.undefined(parent)) {
        this.orphans.push(url);
      } else {
        this.relationships.push(
          new IsChildOf({ child: url, parent: parent, context: 'url' })
        );
      }
    }
  }

  private findParent(url: UniqueUrl, directOnly = false, create = true): UniqueUrl | undefined {
    // Walking up the sortableComponents path until we find a parent should work,
    // but we'll need to figure out how to insert the new URLs without borking
    // the sort order of the entire collection.

    const sortableParent = url.sortableComponents.slice(0, -1).join('/');
    return this.urls.find(candidate => candidate.sortableString === sortableParent);
  }

  async saveHierarchy() {
    return this.storage.push([
      ...this.new,
      ...this.relationships
    ]);
  }
}

