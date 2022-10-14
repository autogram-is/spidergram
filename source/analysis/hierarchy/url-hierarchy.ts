import { UniqueUrl, IsChildOf, UrlSource } from '../../model/index.js';
import { HierarchyBuilder, HierarchyData } from './index.js';
import { ArangoStore } from '../../arango-store.js';
import { GeneratedAqlQuery } from 'arangojs/aql';
import { aql } from 'arangojs';
import is from '@sindresorhus/is';
import { JsonObject } from '../../types.js';
import { NormalizedUrl } from '@autogram/url-tools';


interface UrlHierarchyOptions {
  createMissingParents: boolean,
  createMasterParent: boolean,
  maxParentDistance: number,
  keepOrphans: boolean,
}

export class UrlHierarchy implements HierarchyBuilder<UniqueUrl, IsChildOf> {
  pool: UniqueUrl[] = [];// Candidate URLs to organize
  data: HierarchyData<UniqueUrl, IsChildOf> = {
    participants: [],
    orphans: [],
    new: [],
    relationships: [],
    hierarchy: [],
  };

  constructor(
    protected readonly storage: ArangoStore,
    readonly context='url'
  ) {}

  // Only returns parsable web URLs; additional filter criteria
  // can be passed in, but should use the `aql` template literal
  // function rather than raw strings.
  async loadPool<V>(filter?: GeneratedAqlQuery): Promise<void> {
    const cursor = await this.storage.query(
      aql`
        FOR uu in unique_urls
          FILTER uu.parsed != null
          FILTER uu.parsed.protocol IN ['http:', 'https:']
          ${filter}
          return uu`
    )
    return await cursor.map(result => {
      return UniqueUrl.fromJSON(result as JsonObject)
    })
    .then(urls => { this.pool = urls })
    .then(() => { this.sort() })
  }

  // Loads in the hierarchy relationships for a given context,
  // then all child and parent entities.
  async loadHierarchy(context = 'url'): Promise<void> {
    throw new Error('Not yet implemented.');
  }

  // Sort them by our magic 'sortable key' value; this ensures that
  // popping the last item will always produce the most distant
  // leaf nodes possible.
  protected sort() {
    this.pool.sort((a: UniqueUrl, b: UniqueUrl): number => {
      return a.sortableString.localeCompare(b.sortableString);
    });
  }

  async buildRelationships(customOptions: Partial<UrlHierarchyOptions> = {}) {
    const options = {
      createMissingParents: true,
      createMasterParent: false,
      maxParentDistance: Infinity,
      keepOrphans: false,
      ...customOptions
    };

    this.sort();

    let url: UniqueUrl | undefined;
    while (url = this.pool.pop()) {
      const parent = this.findParent(url, options);
  
      if (is.undefined(parent)) {
        this.data.orphans.push(url);
      } else {
        this.data.relationships.push(
          new IsChildOf({ child: url, parent: parent, context: 'url' })
        );
        this.data.participants.push(url);
      }
    }
  }

  async buildHierarchy(): Promise<void> {
    // if relationships is empty OR participants is empty
    // load all relationships
    // load all vertices mentioned in the relationships
    // build them into tree form
    throw new Error('Not yet implemented');
  }

  private findParent(
    url: UniqueUrl,
    options: UrlHierarchyOptions,
    distance = 1
  ): UniqueUrl | undefined {
    const maxDistance = options.createMissingParents ? Math.min(options.maxParentDistance, url.sortableComponents.length) : 1;
    const potentialParent = url.sortableComponents.slice(0, -distance).join('/');

    let parent = this.pool.find(candidate => candidate.sortableString === potentialParent);
    if (is.undefined(parent)) {
      if (distance >= maxDistance) {
        return undefined;
      } else {
        return this.findParent(url, options, ++distance);
      }
    } else {
      if (options.createMissingParents && distance > 1) {
        parent = this.createMissingParents(url.parsed!, parent.parsed!);
      }
      return parent;
    }
  }

  private createMissingParents(child: NormalizedUrl, ancestor: NormalizedUrl): UniqueUrl | undefined {
    const newUrls: UniqueUrl[] = [];
    for (
      let path = child.path.slice(0,-1);
      (path.length > 0) && (path.length > ancestor.path.length);
      path.pop()
    ) {
      newUrls.push(new UniqueUrl({
        url: `${child.protocol}//${child.host}/${path.join('/')}`,
        source: UrlSource.Path,
        normalizer: url => url
      }));
    }

    this.data.new.push(...newUrls);
    this.pool.push(...newUrls);
    this.sort();
  
    return newUrls[0];
  }

  async save() {
    await this.storage.push([
      ...this.data.new,
      ...this.data.relationships
    ]);
  }
}

