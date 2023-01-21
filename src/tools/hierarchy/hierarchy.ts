/**
 * How an item should be treated when a distant ancestor, but no direct
 * parent, can be found in the pool of items.
 * 
 * @remark
 * These strategies make sense for data like URLs, where a full path is
 * present in an item's data. It may not be possible to apply them with
 * other hierarchy-building mechanisms; DISCARD and SEPARATE are the
 * best fallbacks in those situations.
 */
export const enum GapStrategy {
  /**
   * Treat the item as a direct child of its closest ancestor.
   */
  ADOPT = 'adopt',

  /**
   * Create intermediary parents linking the item to its closest ancestor.
   */
  BRIDGE = 'bridge',

  /**
   * Discard the item (and its children, if they exist).
   */
  DISCARD = 'prune',
}

/**
 * Options and flags to control how a pool of objects should be transformed
 * into a hierarchy.
 */
export interface HierarchyOptions<T = unknown> {
  /**
   * How an item should be treated when a distant ancestor, but no direct
   * parent, can be found in the pool of items.
   * 
   * @defaultValue `GapStrategy.ADOPT`
   */
  gaps?: GapStrategy,

  /**
   * If multiple roots nodes are found, create a new parent to consolidate them.
   * 
   * @defaultValue `true`
   */
  forceSingleRoot?: boolean,

  /**
   * A pointer to the unique identifier for each item; this should be the name
   * of a property on the item, a dot-notation path to a property, or a function
   * that will return a unique ID for the item as a string.
   */
  key?: string | ((input: T) => string),
}

type Dictionary = Record<string, unknown>;

export abstract class HierarchyItem<ItemValue = unknown, ExtraData extends Dictionary = Dictionary> {
  data?: ExtraData;
  key: string;
  value: ItemValue;
  parent?: HierarchyItem<ItemValue>;
  children: HierarchyItem<ItemValue>[];
  protected _descendents = -1;

  constructor(value: ItemValue, data?: ExtraData) {
    this.key = this.makeKey(value, data);
    this.value = value;
    this.data = data;
    this.children = [];
  }

  setParent(parent?: HierarchyItem<ItemValue, ExtraData>) {
    if (this.parent?.key !== parent?.key) {
      this.parent?.removeChild(this);
      parent?.addChild(this);
    }
  }

  addChildren(items: HierarchyItem<ItemValue, ExtraData>[]) {
    for(const item of items) {
      this.addChild(item);
    }
  }

  addChild(item: HierarchyItem<ItemValue, ExtraData>) {
    if (item.key === this.key) return;

    const index = this.children.findIndex(child => child.key === item.key);
    if (index === -1) this.children.push(item);

    if (item.parent === undefined) {
      item.parent = this;
    } else if (item.parent.key !== this.key) {
      item.parent.removeChild(item);
    }

    item.parent = this;
  }

  removeChild(item: HierarchyItem<ItemValue, ExtraData>) {
    if (item.key === this.key) return;

    const index = this.children.findIndex(child => child.key === item.key);
    if (index > -1) this.children.splice(index, 1);

    if (item.parent?.key === this.key) item.parent = undefined;
  }

  abstract makeKey(value: ItemValue, data?: ExtraData): string;

  get isOrphan(): boolean {
    return (this.parent === undefined && this.children.length === 0);
  }

  get isRoot(): boolean {
    return (this.parent === undefined && this.children.length > 0);
  }

  get isLeaf(): boolean {
    return (this.parent !== undefined && this.children.length === 0);
  }

  countDescendents(force = false): number {
    if (force || this._descendents === -1) {
      this._descendents = [
        this.children.length,
        ...this.children.flatMap(child => child.countDescendents())
      ].reduce((prev, curr) => prev + curr);
    }
    return this._descendents;
  }

  toTreeString(indent = 0, marker = '└─') {
    let prefix = '';
    if (indent > 0) {
      prefix = '  '.repeat(indent) + marker;
    }
    let str = `${prefix} ${this.key}\n`;
    for (const child of this.children) {
      str += child.toTreeString(indent + 1, marker);
    }
    return str;
  }
}

/**
 * Abstract base for classes that accept arbitrary objects and build
 * one of more hierarchies.  
 */
export abstract class HierarchyBuilder<
  ItemValue = unknown,
  ExtraData extends Dictionary = Dictionary,
  ItemType extends HierarchyItem = HierarchyItem<ItemValue, ExtraData>, 
> {
  items: ItemType[];

  constructor() {
    this.items = [];
  }

  /**
   * Iterates through the internal list of items (or a subset of
   * those items passed in in via the first parameter), and populates
   * their `parent` and `children` properties.
   */
  abstract populateRelationships(items?: ItemType[]): void

  /**
   * Given an item of type <ItemValue>, build a wrapper item to
   * store its parent, children, and other hierarchy properties.
   */
  protected abstract makeItem(value: ItemValue): ItemType;

  /**
   * Add one or more items to the hierarchy.
   */
  add(input: ItemValue | ItemValue[]) {
    const values = Array.isArray(input) ? input : [input];
    const newItems = values.map(value => this.makeItem(value));
    this.items.push(...newItems);
    this.populateRelationships(newItems);
  }

  protected sort() {
    this.items.sort((a: ItemType, b: ItemType): number => 
      a.key.localeCompare(b.key)
    )
  }

  /**
   * Returns a list of Hierarchy items that have children, but no parent.
   */
  getRoots() {
    return this.items.filter(item => item.isRoot).sort((a, b) => a.countDescendents() - b.countDescendents());
  }

  /**
   * Returns a list of Hierarchy items that have no parents and no children.
   */
  getOrphans() {
    return this.items.filter(item => item.isOrphan);
  }
}
