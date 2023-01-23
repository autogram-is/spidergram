import _ from 'lodash';
import { HierarchyBuilder } from "./hierarchy-builder.js";
import { HierarchyItem } from './hierarchy-item.js';
import { NormalizedUrl, ParsedUrl } from '@autogram/url-tools';

type ObjectWithUrl = Record<string, unknown> & { url: string | ParsedUrl };
type UrlInput = string | URL | ObjectWithUrl;

class UrlHierarchyItem extends HierarchyItem<ObjectWithUrl> {
  gap?: string;
  get label() {
    return this.data.name?.toString() ?? this.name ?? this.id.split('/').pop() ?? this.hierarchyId;
  }
}

/**
 * Behavioral flags for the UrlHierarchyBuilder class
 */
export interface UrlHierarchyBuilderOptions {
  /**
   * Ignore URL search parameters when constructing the hierarchy; multiple
   * records with the same url will be collapsed into a single Hierarchy Item.
   * 
   * @defaultValue `false`
   */
  ignoreSearch?: boolean;

  /**
   * Ignore URL hashtags/fragments when constructing the hierarchy; multiple
   * records with the same url will be collapsed into a single Hierarchy Item.
   * 
   * @defaultValue `false`
   */
  ignoreHash?: boolean;

  /**
   * A strategy for resolving gaps in the URL hierarchy.
   * 
   * If example.com and example.com/assets/image.jpg both exist, but example.com/assets
   * does not, a gap in the URL hierarchy exists.
   * 
   * - ignore: Do not attempt to fix the gap; example.com/assets/image.jpg will become an orphan node, or a new root node if it has its own children.
   * - adopt: Set the child's parent to its closest ancestor, if one can be found.
   * - bridge: Fill the gap with new HierarchyItem records 
   * 
   * @defaultValue `adopt`
   */
  gaps?: 'ignore' | 'adopt' | 'bridge';

  /**
   * A strategy for dealing with multiple related subdomains in a URL pool
   * 
   * - ignore: Subdomains are treated as standalone hosts and will form their own root nodes.
   * - children: Subdomains are treated as children of their TLD, if it exists as a root node.
   * 
   * @defaultValue `ignore`
   */
  subdomains?: 'ignore' | 'children'

  /**
   * An optional base URL to use with incomplete or relative URLs 
   */
  base?: string;

  /**
   * An optional normalizer function to clean up incoming URLs; should accept
   * a {@link ParsedUrl} and return the same {@link ParsedUrl}, after alterations.
   */
  normalizer?: (url: ParsedUrl) => ParsedUrl;
}

const defaults: UrlHierarchyBuilderOptions = {
  subdomains: 'ignore',
  ignoreSearch: false,
  ignoreHash: true,
  gaps: 'adopt'
}

/**
 * Constructs a hierarchy of nodes based on URL path structures.
 */
export class UrlHierarchyBuilder extends HierarchyBuilder<UrlHierarchyItem, ObjectWithUrl, UrlInput> {
  options: UrlHierarchyBuilderOptions;

  /**
   * Creates an instance of UrlHierarchyBuilder.
   */
  constructor(customOptions: UrlHierarchyBuilderOptions = {}) {
    super();
    this.options = _.defaultsDeep(customOptions, defaults);
  }

  /**
   * Given a string, a URL, or an object with a 'url' property, construct a new UrlHierarchyItem.
   */
  makeItem(input: UrlInput) {
    /**
     * Description placeholder
     */
    const url = this.normalizeUrlData(input);
    const id = this.urlToId(url);

    if (typeof input === 'string' || input instanceof URL) {
      const item = new UrlHierarchyItem({ url: url });
      item.id = id;
      return item;
    } else {
      const item = new UrlHierarchyItem(input);
      item.id = id;
      return item;
    }
  }

  /**
   * Iterate through the HierarchyBuilder's pool of items, and build parent/child
   * relationships between them.
   * 
   * @returns A copy of the HierarchyBuilder object, appropriate for chaining.
   */
  populateRelationships(): this {
    for (const item of this.items) {
      const parent = this.findAncestor(item);
      if (parent) item.setParent(parent);
    }
    return this;
  }

  /**
   * Create a new Parent Item, add any number of existing items as its children,
   * and add it to the Hierarchy pool as a new root item.
   */
  createRoot(rootName: string, children: UrlHierarchyItem[] = []) {
    const id = 'root:' + rootName;
    const root = new UrlHierarchyItem({ url: id });
    root.id = id;
    root.gap = 'filled';
    this._items.set(id, root);
    for(const child of children) {
      root.addChild(child);
    }
    return root;
  }

  protected findAncestor(child: UrlHierarchyItem): UrlHierarchyItem | undefined {
    const segments = child.id.split('/');
    let ancestor: UrlHierarchyItem | undefined;

    while(ancestor === undefined && segments.length > 0) {
      segments.pop();
      ancestor = this._items.get(segments.join('/'))
    }

    if (ancestor) {
      const distance = this.getDistance(ancestor, child);
      if (distance < 1) return undefined;
      if (distance === 1) return ancestor;
      if (distance > 1) return this.getDirectParent(ancestor, child);
    } else {
      if (
        child.id.split('/').length === 1 && 
        this.options.subdomains === 'children'
      ) {
        const url = new ParsedUrl('https://' + child.id);
        if (child.id === url.domain) return undefined;
        if (this._items.has(url.domain)) return this._items.get(url.domain);
      }
    }

    return undefined;
  }

  protected normalizeUrlData(input: UrlInput): ParsedUrl {
    if (typeof input === 'string') {
      return new NormalizedUrl(input, this.options.base, this.options.normalizer);
    } else if (input instanceof URL) {
      return new NormalizedUrl(input.href, this.options.base, this.options.normalizer);
    } else {
      return this.normalizeUrlData(input.url);
    }
  }

  protected urlToId(url: ParsedUrl): string {
    // Trailing slashes and double-slashes in the pathname mess things up something
    // fierce. We kill 'em.
    if (url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1);
    if (url.pathname.includes('//')) url.pathname = url.pathname.replaceAll(/\/+/ig,"/");

    const key: string[] = [];
    key.push(url.hostname);
    key.push(...url.path);
    if (!this.options.ignoreSearch && url.search.length) key.push(url.search);
    if (!this.options.ignoreHash && url.hash.length) key.push(url.hash);
    return key.join('/');
  }

  protected getDistance(ancestor: UrlHierarchyItem, descendant: UrlHierarchyItem): number {
    if (descendant.id === ancestor.id) {
      return 0;
    } else if (descendant.id.startsWith(ancestor.id)) {
      return descendant.id.split('/').length - ancestor.id.split('/').length
    } else {
      return -1;
    }
  }

  protected getDirectParent(ancestor: UrlHierarchyItem, descendant: UrlHierarchyItem): UrlHierarchyItem | undefined {
    if (!descendant.id.startsWith(ancestor.id)) return undefined;

    if (this.options.gaps === 'bridge') {
      // When filling gaps, we start with the ancestor, build our way 'down' until
      // we've created the direct parent, then return the direct parent.
      let currentParent = ancestor;
      const gapSegments = descendant.id.slice(ancestor.id.length+1).split('/').slice(0,-1);
      if (gapSegments.length < 1) return;
  
      while (gapSegments.length > 0) {
        const newId = [currentParent.id, gapSegments.shift()].join('/');
        const filler = new UrlHierarchyItem({ url: 'https://' + newId });
        filler.id = newId;
        filler.gap = 'bridge';
        filler.setParent(currentParent)
        this._items.set(filler.id, filler);
        currentParent = filler;
      }
      return currentParent;
    } else if (this.options.gaps === 'adopt') {
      // When bridging gaps, the ancestor is treated as the direct parent
      // regardless of its distance from the descendant.
      descendant.gap = 'adopted';
      return ancestor;
    } else {
      return undefined;
    }
  }
}