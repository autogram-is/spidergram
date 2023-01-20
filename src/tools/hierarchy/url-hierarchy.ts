import _ from 'lodash';
import { NormalizedUrl, NormalizedUrlSet, ParsedUrl } from "@autogram/url-tools";
import {
  HierarchyItem,
  HierarchyOptions,
  GapStrategy,
  HierarchyBuilder
} from "./hierarchy.js";

export interface UrlHierarchyOptions extends HierarchyOptions {
  base?: string,
  normalizer?: (url: ParsedUrl) => ParsedUrl,
}

const defaults: UrlHierarchyOptions = {
  gaps: GapStrategy.ADOPT,
  forceSingleRoot: true,
}

/**
 * Encapsulates a single NormalizedUrl and its hierarchical relationships to nearby URLs.
 */
export class UrlHierarchyItem extends HierarchyItem<NormalizedUrl> {
  title: string;

  constructor(value: NormalizedUrl, public inferred = false) {
    // Trailing slashes mess us up something fierce.
    if (value.href.endsWith('/')) value.href = value.href.slice(0, -1);

    super(value);
    let title = this.key.split('/').pop();
    if (title === undefined || title.trim().length === 0) title = 'Root';
    this.title = title;
  }

  makeKey(value: NormalizedUrl): string {
    return makeKey(value);
  }
}

/**
 * Organize a collection of NormalizedUrls into one or more hierarchical tress
 * to reflect their URL structure.
 */
export class UrlHierarchyBuilder extends HierarchyBuilder<NormalizedUrl, UrlHierarchyItem> {
  options: UrlHierarchyOptions;

  constructor(items: string[] | NormalizedUrl[], customOptions: UrlHierarchyOptions = {}) {
    super();
    this.options = _.defaultsDeep(customOptions, defaults);

    const urls = new NormalizedUrlSet(items, {
      base: this.options.base,
      normalizer: this.options.normalizer
    });

    this.add([...urls])
    this.populateRelationships();
  }

  protected makeItem(value: NormalizedUrl): UrlHierarchyItem {
    return new UrlHierarchyItem(value);
  }

  /**
   * Walks through the flat list of participant items; if a parent can be found
   * it populates the item's parent and adds the item to the parents' children.
   * If an ancestor but no direct parent can be found, it uses the {@link GapStrategy}
   * specified in {@link UrlHierarchyOptions.gaps}.
   */
  populateRelationships(input: UrlHierarchyItem[] = this.items) {
    this.sort();
    for (const item of input) {
      const parent = this.findAncestor(item.value);
      if (parent) item.setParent(parent);
    }
  }

  protected compareValues(a: NormalizedUrl, b: NormalizedUrl): number {
    return makeKey(a).localeCompare(makeKey(b));
  }

  combineRootItems(): UrlHierarchyItem | undefined {
    const roots = this.getRoots();
    if (roots.length) {
      const root = this.makeItem(new NormalizedUrl('root:web'));
      root.inferred = true;
      root.addChildren(roots);
      this.items.push(root);
      return root;
    } if (roots.length === 1) {
      return roots[0];
    }
    return;
  }

  /**
   * Find the closest ancestor for a given URL in the list of known URLs.
   *
   * @returns The HierarchyItem for the ancestor URL, if an ancestor exists.
   */
  protected findAncestor(
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
      potentialParent => potentialParent.value.href === parentUrl.href
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

// We've split this helper function out because we use it
// when creating the full list of ancestor URLs.
function makeKey(url: NormalizedUrl): string {
  const key: string[] = [];
  key.push(url.domain);
  key.push(url.subdomain);
  key.push(...url.path);
  if (url.search.length) key.push(url.search);
  if (url.hash.length) key.push(url.hash);
  return key.join('/'); 
}