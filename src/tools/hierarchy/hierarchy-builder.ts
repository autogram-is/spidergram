import { HierarchyItem } from './hierarchy-item.js';

export abstract class HierarchyBuilder<
  ItemType extends HierarchyItem = HierarchyItem,
  UserData = Record<string, unknown>,
  InputType = UserData
> {
  _items: Map<string, ItemType>;
  
  constructor() {
    this._items = new Map<string, ItemType>();
  }
  
  abstract makeItem(input: InputType): ItemType;
  
  abstract populateRelationships(): this;

  get items() {
    return [...this._items.values()];
  }

  add(input: InputType | InputType[], populateRelationships = true): this {
    const inputs = Array.isArray(input) ? input : [input];
    for (const i of inputs) {
      const item = this.makeItem(i);
      this._items.set(item.id, item);
    }
    if (populateRelationships) this.populateRelationships();
    return this;
  }

  remove(input: ItemType | ItemType[]): this {
    const inputs = Array.isArray(input) ? input : [input];
    for (const item of inputs) {
      item.setParent(undefined);
      for (const child of item.children) {
        child.setParent(undefined)
      }
      this._items.delete(item.id);
    }
    return this;
  }
  
  findRoot(): ItemType | undefined {
    return this.items.find(item => item.isRoot);
  }

  findRoots(): ItemType[] {
    return this.items.filter(item => item.isRoot);
  }
}