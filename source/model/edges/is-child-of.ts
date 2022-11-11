import {Resource} from '../index.js';
import {Vertice, Reference} from '../vertices/vertice.js';
import {Edge, EdgeData} from './edge.js';

export type IsChildOfType<F extends Vertice = Resource, T extends Vertice = Resource> = EdgeData<F, T> & {
  child?: Reference<F>;
  parent?: Reference<T>;
};

export class IsChildOf<F extends Vertice = Resource, T extends Vertice = Resource> extends Edge<F, T> {
  readonly _collection = 'is_child_of';

  constructor(data: IsChildOfType<F, T> = {}) {
    const {child, parent, ...dataForSuper} = data;

    dataForSuper.from ??= child;
    dataForSuper.to ??= parent;

    super(dataForSuper);

    this.assignKey();
  }

  // Only one parent/child relationship per label.
  protected override keySeed(): unknown {
    return {from: this._from, to: this._to, label: this.label};
  }
}

Vertice.types.set('is_child_of', {constructor: IsChildOf, isEdge: true});
