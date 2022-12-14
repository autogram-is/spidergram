import is from '@sindresorhus/is';

import { GeneratedAqlQuery } from 'arangojs/aql';
import {
  Vertice,
  Edge,
  UniqueUrl,
  IsChildOf,
  UrlSource,
  ArangoStore,
  aql,
} from '../index.js';
import { ParsedUrl } from '@autogram/url-tools';
import { JsonMap } from '@salesforce/ts-types';

export interface HierarchyData<
  V extends Vertice = Vertice,
  E extends Edge = Edge,
> {
  participants: V[];
  orphans: V[];
  new: V[];
  relationships: E[];
  hierarchy: Array<HierarchyItem<V>>;
}

export interface HierarchyItem<V extends Vertice = Vertice> {
  item: V;
  children: Array<HierarchyItem<V>>;
}

interface UrlHierarchyOptions {
  fillGaps: boolean;
  maxParentDistance: number;
  keepOrphans: boolean;
  urlToSortable?: (url: ParsedUrl) => string[];
  createParent?: (child: ParsedUrl) => ParsedUrl | false;
}

export class UrlHierarchyBuilder {
  pool: UniqueUrl[] = []; // Candidate URLs to organize
  data: HierarchyData<UniqueUrl, IsChildOf> = {
    participants: [],
    orphans: [],
    new: [],
    relationships: [],
    hierarchy: [],
  };

  constructor(protected readonly graph: ArangoStore, readonly label = 'url') {}

  // Only returns parsable web URLs; additional filter criteria
  // can be passed in, but should use the `aql` template literal
  // function rather than raw strings.
  async loadPool<V>(filter?: GeneratedAqlQuery): Promise<void> {
    const cursor = await this.graph.query<JsonMap>(
      aql`
        FOR item in unique_urls
          FILTER item.parsed != null
          FILTER item.parsed.protocol IN ['http:', 'https:']
          ${filter}
          return item`,
    );
    await cursor
      .map(result => UniqueUrl.fromJSON(result))
      .then(urls => {
        this.pool = urls;
      })
      .then(() => {
        this.sort();
      });
  }

  // Loads in the hierarchy relationships for a given label,
  // then all child and parent entities.
  async loadHierarchy(label = 'url'): Promise<void> {
    throw new Error('Not yet implemented.');
  }

  async buildRelationships(customOptions: Partial<UrlHierarchyOptions> = {}) {
    const { urlToSortable, createParent, ...config } = customOptions;

    const options = {
      fillGaps: true,
      maxParentDistance: Number.POSITIVE_INFINITY,
      keepOrphans: false,
      ...config,
    };

    if (urlToSortable) {
      this.urlToSortable = urlToSortable;
    }

    if (createParent) {
      this.createParent = createParent;
    }

    this.sort();

    let url: UniqueUrl | undefined;
    while ((url = this.pool.pop())) {
      const parent = this.findParent(url.parsed!, options);

      if (is.undefined(parent)) {
        this.data.orphans.push(url);
      } else {
        this.data.relationships.push(
          new IsChildOf({ child: url, parent, label: 'url' }),
        );
        this.data.participants.push(url);
      }
    }
  }

  async buildHierarchy(): Promise<void> {
    // If relationships is empty OR participants is empty
    // load all relationships
    // load all vertices mentioned in the relationships
    // build them into tree form
    throw new Error('Not yet implemented');
  }

  async save() {
    await this.graph.push([...this.data.new, ...this.data.relationships]);
  }

  urlCompare(a: ParsedUrl, b: ParsedUrl): number {
    return this.sortKey(a).localeCompare(this.sortKey(b));
  }

  isDirectParent(child: ParsedUrl, candidate: ParsedUrl): boolean {
    const expectedParent = this.createParent(child);
    if (expectedParent && this.urlCompare(expectedParent, candidate) === 0) {
      return true;
    }

    return false;
  }

  createParent(child: ParsedUrl): ParsedUrl | false {
    const parent = new ParsedUrl(child.href);

    // We'll ignore search params here.
    parent.hash = '';
    parent.search = '';
    if (parent.path.length > 0) {
      parent.pathname = parent.path.slice(0, -1).join('/');
    } else if (parent.subdomain) {
      // Assume that foo.example.com/ is the child of example.com/
      parent.subdomain = '';
    }

    if (parent.href === child.href) {
      return false;
    }

    return parent;
  }

  sortKey(url: ParsedUrl): string {
    return this.urlToSortable(url).join('/');
  }

  urlToSortable(url: ParsedUrl): string[] {
    let components = [url.domain.replace('/', '')];
    if (is.nonEmptyStringAndNotWhitespace(url.subdomain)) {
      components.push(url.subdomain);
    }

    if (is.nonEmptyArray(url.path)) {
      components = [...components, ...url.path];
    }

    if (is.nonEmptyStringAndNotWhitespace(url.search)) {
      components.push(url.search);
    }

    return components;
  }

  // Sort them by our magic 'sortable key' value; this ensures that
  // popping the last item will always produce the most distant
  // leaf nodes possible.
  protected sort() {
    this.pool.sort((a: UniqueUrl, b: UniqueUrl): number =>
      this.sortKey(a.parsed!).localeCompare(this.sortKey(b.parsed!)),
    );
  }

  protected findParent(
    url: ParsedUrl,
    options: UrlHierarchyOptions,
    distance = 1,
  ): UniqueUrl | undefined {
    const maxDistance = options.fillGaps
      ? Math.min(options.maxParentDistance, this.urlToSortable(url).length)
      : 1;
    let parent = this.pool.find(candidate =>
      this.isDirectParent(url, candidate.parsed!),
    );

    if (is.undefined(parent)) {
      if (distance >= maxDistance) {
        return undefined;
      }

      return this.findParent(url, options, ++distance);
    }

    if (options.fillGaps && distance > 1) {
      parent = this.connectToAncestor(url, parent.parsed!);
    }

    return parent;
  }

  protected connectToAncestor(
    child: ParsedUrl,
    ancestor: ParsedUrl,
  ): UniqueUrl | undefined {
    const newUrls: UniqueUrl[] = [];

    for (
      let parent = this.createParent(child);
      parent && this.urlCompare(parent, ancestor) > 0;
      parent = this.createParent(child)
    ) {
      newUrls.push(
        new UniqueUrl({
          url: parent.href,
          source: UrlSource.Path,
          normalizer: url => url,
        }),
      );
    }

    this.data.new.push(...newUrls);
    this.pool.push(...newUrls);
    this.sort();

    return newUrls[0];
  }
}
