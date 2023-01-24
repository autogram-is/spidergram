import _ from 'lodash';

/**
 * An individual node in a hierarchy, responsible for its own identity and
 * parent/child relationships.
 * 
 * @typeParam UserData - Payload data for the hierarchy item
 */
export class HierarchyItem<UserData = Record<string, unknown>> {
  protected static _idCounter = 0;
  protected _name?: string;
  protected _hierarchyId = HierarchyItem._idCounter++;
  protected _id?: string;

  /**
   * The item's direct parent
   */
  parent?: this;

  /**
   * The item's direct children
   */
  children: this[];
  
  /**
   * Create a new hierarchy item with the passed-in data, but no parents or children 
   */
  constructor(public data: UserData) {
    this.children = [];
  }
  
  /**
   * A unique ID for the item in the hiearchy. Used by HierarchyBuilder as a
   * key for storing and retrieving items.
   * 
   * @remarks
   * Changing an item's ID after the hierarchy has been built is likely to mess
   * everything up in dramatic and interesting ways.
   * 
   * @defaultValue An auto-generated sequential integer
   */
  get id(): string {
    if (this._id === undefined) this._id = this._hierarchyId.toString();
    return this._id;
  }

  set id(input: string) {
    this._id = input;
  }

  /**
   * An auto-generated sequential integer used as a fallback ID
   */
  get hierarchyId() {
    return this._hierarchyId;
  }

  /**
   * A descriptive label for the node; if none exists, falls back to the ID.
   */
  get name(): string {
    return this._name ?? this.id;
  }

  set name(input: string) {
    this._name = input;
  }


  /**
   * Set or remove the item's parent, removing it from the previous parent's children
   * and adding it to the new parent's children as necessary.  
   */
  setParent(newParent?: this) {
    const existingParent = this.parent;

    if (newParent?.id === existingParent?.id) return;
    if (newParent?.id === this.id) throw new Error('Item cannot be its own parent');

    if (existingParent) {
      existingParent.removeChild(this);
    }

    this.parent = newParent;

    if (newParent) {
      newParent.addChild(this);
    }
  }

  /**
   * Add a node to the item's list of children, updating that child's existing
   * parent if necessary.  
   */
  addChild(newChild: this) {
    // No self-inheriting
    if (newChild.id === this.id) throw new Error('Item cannot be its own child');

    // No ancestors as children
    if (this.ancestors.map(ancestor => ancestor.id).includes(newChild.id)) {
      throw new Error('Item cannot have an ancestor as a descendant');
    }

    // If the item is already a child, return.
    if (this.children.find(existingChild => existingChild.id === newChild.id)) return;

    // Add the child and set its parent
    this.children.push(newChild);
    newChild.setParent(this);
  }
  /**
   * Remove a node from the item's list of children, and update the child node's parent.  
   */
  removeChild(existingChild: this) {
    const index = this.children.findIndex(candidate => candidate.id === existingChild.id);

    // If it isn't a child already, return
    if (index === -1) return;

    // remove the child and unset its parent
    this.children.splice(index, 1);
    existingChild.setParent(undefined);
  }
  
  /**
   * An array of parent nodes, starting with the item's direct parent and ending with its root node.
   */
  get ancestors(): this[] {
    if (this.parent === undefined) return [];
    return [this.parent, ...this.parent.ancestors];
  }
  
  /**
   * An array of nodes containing the current item and all of its descendants
   */
  get flattened(): this[] {
    return [this, ...this.descendants];
  }

  /**
   * An array of nodes containing all of the current item's descendants
   */
  get descendants(): this[] {
    return _.flattenDeep([this.children, ...this.children.map(child => child.descendants)]);
  }

  /**
   * An array of nodes containing the current item's siblings: i.e.,
   * other children of its parent node.
   */
  get siblings(): this[] {
    if (this.parent === undefined) return [];
    return [...this.parent.children].filter(item => item.id !== this.id);
  }


  /**
   * A Root node has children but no parent.
   */
  get isRoot() {
    return (this.parent === undefined && this.children.length > 0);
  }
  
  /**
   * An Orphan node has no parents, and no children.
   */
  get isOrphan() {
    return (this.parent === undefined && this.children.length === 0);
  }

  /**
   * A Leaf node has a parent, but no children.
   */
  get isLeaf(): boolean {
    return (this.parent !== undefined && this.children.length === 0);
  }
}
