import _ from 'lodash';
import { HierarchyBuilder } from "./hierarchy-builder.js";
import { HierarchyItem } from './hierarchy-item.js';
import { NormalizedUrl, ParsedUrl } from '@autogram/url-tools';

type ObjectWithUrl = Record<string, unknown> & { url: string | ParsedUrl };
type UrlInput = string | URL | ObjectWithUrl;
class UrlHierarchyItem extends HierarchyItem<ObjectWithUrl> {}

export interface UrlHierarchyBuilderOptions {
  ignoreSearch?: boolean;
  ignoreHash?: boolean;
  gaps?: 'discard' | 'close';
  subdomains?: 'ignore' | 'grouped' | 'children'
  base?: string;
  normalizer?: (url: ParsedUrl) => ParsedUrl;
}

const defaults: UrlHierarchyBuilderOptions = {
  subdomains: 'ignore',
  ignoreSearch: false,
  ignoreHash: true,
  gaps: 'close'
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

  protected findAncestor(input: UrlHierarchyItem): UrlHierarchyItem | undefined {
    const segments = input.id.split('/');
    const stopDepth = (this.options.gaps === 'discard') ? segments.length - 1 : 0

    while(segments.length > stopDepth) {
      segments.pop();
      const ancestorKey = segments.join('/');
      if (this._items.has(ancestorKey)) return this._items.get(ancestorKey);
    }

    // If stopDepth is zero, we've got a hostname with no path.
    if (stopDepth === 0 && this.options.subdomains === 'children') {
      const url = new ParsedUrl('https://' + input.id);
      if (input.id === url.domain) return undefined;
      if (this._items.has(url.domain)) return this._items.get(url.domain);
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
    const key: string[] = [];
    key.push(url.hostname);
    key.push(...url.path);
    if (!this.options.ignoreSearch && url.search.length) key.push(url.search);
    if (!this.options.ignoreHash && url.hash.length) key.push(url.hash);
    return key.join('/');
  }

  createRoot(rootName: string, children: UrlHierarchyItem[] = []) {
    const id = 'root:' + rootName;
    const root = new UrlHierarchyItem({ url: id });
    root.id = id;
    this._items.set(id, root);
    for(const child of children) {
      root.addChild(child);
    }
    return root;
  }
}
