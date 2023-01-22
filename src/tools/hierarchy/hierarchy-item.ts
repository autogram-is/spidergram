import _ from 'lodash';

export class HierarchyItem<UserData = Record<string, unknown>> {
  static idCounter = 0;
  protected _id?: string;
  parent?: this;
  children: this[];
  
  constructor(public data: UserData) {
    this.children = [];
  }
  
  get id(): string {
    if (this._id === undefined) this._id = (HierarchyItem.idCounter++).toString();
    return this._id;
  }

  set id(input: string) {
    this._id = input;
  }

  get label(): string {
    return this.id;
  }

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

  addChild(newChild: this) {
    // No self-inheriting
    if (newChild.id === this.id) throw new Error('Item cannot be its own child');

    // No ancestors as children
    if (this.ancestors.map(ancestor => ancestor.id).includes(newChild.id)) {
      throw new Error('Item cannot have an ancestor as a descendent');
    }

    // If the item is already a child, return.
    if (this.children.find(existingChild => existingChild.id === newChild.id)) return;

    // Add the child and set its parent
    this.children.push(newChild);
    newChild.setParent(this);
  }

  removeChild(existingChild: this) {
    const index = this.children.findIndex(candidate => candidate.id === existingChild.id);

    // If it isn't a child already, return
    if (index === -1) return;

    // remove the child and unset its parent
    this.children.splice(index, 1);
    existingChild.setParent(undefined);
  }
  
  get ancestors(): this[] {
    if (this.parent === undefined) return [];
    return [this.parent, ...this.parent.ancestors];
  }
  
  get flattened(): this[] {
    return [this, ...this.descendents];
  }

  get descendents(): this[] {
    return _.flattenDeep([this.children, ...this.children.map(child => child.descendents)]);
  }

  get siblings(): this[] {
    if (this.parent === undefined) return [];
    return [...this.parent.children].filter(item => item.id !== this.id);
  }

  get isRoot() {
    return (this.parent === undefined && this.children.length > 0);
  }
  
  get isOrphan() {
    return (this.parent === undefined && this.children.length === 0);
  }

  get isLeaf() {
    return (this.parent && this.children.length === 0);
  }

  toTreeString(indent = 0) {
    let output = '  '.repeat(indent) + this.label + `\n`;
    for (const child of this.children) {
      output += child.toTreeString(indent + 1);
    }
    return output;
  }
}
