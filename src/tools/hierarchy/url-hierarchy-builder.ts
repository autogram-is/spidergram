import _ from 'lodash';
import { HierarchyBuilder } from "./hierarchy-builder.js";
import { HierarchyItem } from './hierarchy-item.js';
import { NormalizedUrl, ParsedUrl } from '@autogram/url-tools';

type ObjectWithUrl = Record<string, unknown> & { url: string | ParsedUrl };
type UrlInput = string | URL | ObjectWithUrl;
class UrlHierarchyItem extends HierarchyItem<ObjectWithUrl> {
  gap?: string;
  get label() {
    return this.id.split('/').pop() ?? this.id;
  }
}

export interface UrlHierarchyBuilderOptions {
  ignoreSearch?: boolean;
  ignoreHash?: boolean;
  gaps?: 'discard' | 'bridge' | 'fill';
  subdomains?: 'ignore' | 'children'
  base?: string;
  normalizer?: (url: ParsedUrl) => ParsedUrl;
}

const defaults: UrlHierarchyBuilderOptions = {
  subdomains: 'ignore',
  ignoreSearch: false,
  ignoreHash: true,
  gaps: 'bridge'
}

export class UrlHierarchyBuilder extends HierarchyBuilder<UrlHierarchyItem, ObjectWithUrl, UrlInput> {
  options: UrlHierarchyBuilderOptions;

  constructor(customOptions: UrlHierarchyBuilderOptions = {}) {
    super();
    this.options = _.defaultsDeep(customOptions, defaults);
  }

  makeItem(input: UrlInput) {
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

  populateRelationships(): this {
    for (const item of this.items) {
      const parent = this.findAncestor(item);
      if (parent) item.setParent(parent);
    }
    return this;
  }

  get items() {
    return super.items.sort((a, b) => a.id.localeCompare(b.id));
  }

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
    if (url.pathname.includes('//')) url.pathname = url.pathname.replaceAll(/\/+/,"/");

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

    if (this.options.gaps === 'fill') {
      // When filling gaps, we start with the ancestor, build our way 'down' until
      // we've created the direct parent, then return the direct parent.
      let currentParent = ancestor;
      const gapSegments = descendant.id.slice(ancestor.id.length+1).split('/').slice(0,-1);
      if (gapSegments.length < 1) return;
  
      while (gapSegments.length > 0) {
        const newId = [currentParent.id, gapSegments.shift()].join('/');
        const filler = new UrlHierarchyItem({ url: 'https://' + newId });
        filler.id = newId;
        filler.gap = 'filled';
        filler.setParent(currentParent)
        this._items.set(filler.id, filler);
        currentParent = filler;
      }
      return currentParent;
    } else if (this.options.gaps === 'bridge') {
      // When bridging gaps, the ancestor is treated as the direct parent
      // regardless of its distance from the descendant.
      descendant.gap = 'bridged';
      return ancestor;
    } else {
      return undefined;
    }
  }
}
