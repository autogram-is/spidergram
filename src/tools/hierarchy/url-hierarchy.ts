import _ from 'lodash';
import { NormalizedUrl, NormalizedUrlSet, ParsedUrl } from "@autogram/url-tools";
import {
  HierarchyItem,
  HierarchyOptions,
  GapStrategy
} from "./hierarchy.js";

export interface UrlHierarchyOptions extends HierarchyOptions {
  base?: string,
  normalizer?: (url: ParsedUrl) => ParsedUrl,
  filter?: (url: URL) => boolean,
}

const defaults: UrlHierarchyOptions = {
  gaps: GapStrategy.ADOPT,
  forceSingleRoot: true,
}

export class Url {
  options: UrlHierarchyOptions;
  items: HierarchyItem<NormalizedUrl>[];

  constructor(items: string[] | NormalizedUrl[], customOptions: UrlHierarchyOptions = {}) {
    this.options = _.defaultsDeep(customOptions, defaults);

    const urls = new NormalizedUrlSet(items, {
      base: this.options.base,
      urlFilter: this.options.filter,
      normalizer: this.options.normalizer
    });

    this.items = [...urls].map(url => this.makeItem(url));
    this.populateRelationships();
  }

  /**
   * Walks through the flat list of participant items; if a parent can be found
   * it populates the item's parent and adds the item to the parents' children.
   * If an ancestor but no direct parent can be found, it uses the {@link GapStrategy}
   * specified in {@link UrlHierarchyOptions.gaps}.
   */
  protected populateRelationships() {
    for (const item of this.items) {
      if (item.value === undefined) continue;
      const parent = this.findAncestor(item.value);
      if (parent) {
        item.parent = parent;
        parent.children.push(item);
      }
    }
  }

  protected sort() {
    this.items.sort((a: HierarchyItem, b: HierarchyItem): number => 
      a.key.localeCompare(b.key)
    )
  }

  protected makeItem(input: NormalizedUrl): HierarchyItem<NormalizedUrl> {
    const key = this.makeKey(input);
    return {
      key: key,
      title: key.split('/').pop(),
      value: input,
      children: []
    } as HierarchyItem<NormalizedUrl>;
  }

  protected makeKey(url: NormalizedUrl): string {
    return this.makeKeys(url).join('/'); 
  }

  protected makeKeys(url: NormalizedUrl): string[] {
    const key: string[] = [];
    key.push(url.domain);
    key.push(url.subdomain);
    key.push(...url.path);
    key.push(url.search);
    key.push(url.hash);
    return key;
  }

  protected compareValues(a: NormalizedUrl, b: NormalizedUrl): number {
    return this.makeKey(a).localeCompare(this.makeKey(b));
  }
  
  findAncestor(
    url: NormalizedUrl,
  ): HierarchyItem<NormalizedUrl> | undefined {
    // Speculatively build a Parent URL for the current one. If we already
    // have a top-level domain, createParentUrl will return false and we
    // can shortcut any other comparisons — it's a root node by default.
    const parentUrl = this.createParentUrl(url);
    if (parentUrl === false) return undefined;
    
    // Scan the collection of HierarchyItems for one that matches our
    // parent URL. 
    const directParent = this.items.find(
      potentialParent => potentialParent.key === this.makeKey(parentUrl)
    );

    // If it's populated, return the match.
    // If it's not, and we're using the GapStrategy DISCARD, bail out.
    // Otherwise, try to find a more distant ancestor.
    if (directParent) {
      return directParent;
    } else if (this.options.gaps === GapStrategy.DISCARD) {
      return undefined;
    } else {
      return this.findAncestor(parentUrl);
    }
  }

  /**
   * Given a NormalizedUrl, build the URL of its parent, whether that URL
   * exists or not.
   * 
   * - If a hash/anchor exists, remove it and return the result.
   * - Else, if a search/param string exists, remove it and return the result.
   * - Else, if URL path exists remove its last item and return the result.
   * - Else, if a subdomain exists remove it and return the TLD.
   * - Return false — the URL is a TLD and no parent can exist.
   * 
   * @returns The constructed parent URL, or `false` if the item is already a TLD.
   */
  createParentUrl(child: NormalizedUrl): NormalizedUrl | false {
    // Parent starts as a duplicate of child. Then we chop off the end
    // and return it.
    const parent = new NormalizedUrl(
      child.href,
      this.options.base,
      this.options.normalizer
    );

    // We treat the subdomain as the highest possible subdirectory;
    // this reflects the fact that we're often building tree structures
    // for multiple sites under a single organization.
    if (parent.hash.length > 0) {
      parent.hash = '';
    } else if (parent.search.length > 0) {
      parent.search = '';
    } else if (parent.path.length > 0) {
      parent.pathname = parent.path.slice(0, -1).join('/');
    } else if (parent.subdomain.length > 0) {
      parent.subdomain = '';
    } else {
      return false;
    }
    
    // If the parent and child equal each other already, we should bail. WTF.
    if (parent.href === child.href) {
      return false;
    }
  
    return parent;
  }
}
