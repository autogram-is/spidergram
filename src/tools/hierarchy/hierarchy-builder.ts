import { HierarchyItem } from './hierarchy-item.js';

/**
 * Abstract base class for all Hierarchy-Building tools. Provides convenience
 * methods for adding and tracking individual items in the hierarchy so custom
 * hierarchy algorithms can focus on parent/child matching logic.
 *
 * @typeParam ItemType - The HierarchyItem subclass used by the builder
 * @typeParam UserData - Payload data for the hierarchy item
 * @typeParam InputType - Input type used to construct hierarchy items; defaults to UserData
 */
export abstract class HierarchyBuilder<
  ItemType extends HierarchyItem = HierarchyItem,
  UserData = Record<string, unknown>,
  InputType = UserData
> {
  _items: Map<string, ItemType>;
  
  constructor() {
    this._items = new Map<string, ItemType>();
  }
  
  /**
   * Construct a new Hierarchy Item and return it *without* inserting it into the Hierarchy.
   * 
   * @remarks
   * In most cases, this will be a wrapper for `new HierarchyItem(input)`. If a custom
   * InputType is specified, however, this function is reponsible for transforming it
   * into the UserData required by the HierarchyItem class before creating the instance.
   */
  abstract makeItem(input: InputType): ItemType;
  

  /**
   * HierarchyBuilder implementations use this function to iterate though the full list
   * of items and populate their parent/child relationships.
   */
  abstract populateRelationships(): this;

  /**
   * A read-only array of all items in the hierarchy, including root nodes, orphans,
   * leaf nodes, and so on.
   */
  get items() {
    return [...this._items.values()];
  }

  /**
   * Takes one or more records, creates new HierarchyItems, adds them to the hierarchy,
   * then optionall recalculates the parent/child relationships of the full hierarchy.
   * 
   * @param input - One or more data objects to be turned into HierarchyItems
   * @param populateRelationships - Set to `false` to suppress recalculating relationships
   */
  add(input: InputType | InputType[], populateRelationships = true): this {
    const inputs = Array.isArray(input) ? input : [input];
    for (const i of inputs) {
      const item = this.makeItem(i);
      this._items.set(item.id, item);
    }
    if (populateRelationships) this.populateRelationships();
    return this;
  }


  /**
   * Remove one or more existing items from the hiearchy pool, optionally recalculating
   * relationships for all other items in the hierarchy.
   *
   * @param input - One or more HierarchyItem instances
   * @param populateRelationships - Set to `false` to suppress recalculating relationships
   * @returns {this}
   */
  remove(input: ItemType | ItemType[], populateRelationships = true): this {
    const inputs = Array.isArray(input) ? input : [input];
    for (const item of inputs) {
      item.setParent(undefined);
      for (const child of item.children) {
        child.setParent(undefined)
      }
      this._items.delete(item.id);
    }

    if (populateRelationships) this.populateRelationships();
    return this;
  }
  
  /**
   * The root node with the largest number of descendants, if one exists.
   */
  findLargestRoot(): ItemType | undefined {
    return this.findRoots()
      .sort((a, b) => a.descendents.length - b.descendents.length)[0];
  }

  /**
   * An array of all root nodes in the Hierarchy pool
   */
  findRoots(): ItemType[] {
    return this.items.filter(item => item.isRoot);
  }
}