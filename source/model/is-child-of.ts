import { Resource } from './resource.js';
import { Edge, EdgeData } from './edge.js';
import { Vertice, Reference } from './vertice.js';

export type IsChildOfType<F extends Vertice = Resource, T extends Vertice = Resource> = EdgeData<F, T> & {
  child?: Reference<F>
  parent?: Reference<T>
  context?: string
};

export class IsChildOf<F extends Vertice = Resource, T extends Vertice = Resource> extends Edge<F, T> {
  override _collection = 'is_child_of';
  context: string

  constructor(data: IsChildOfType<F, T> = {}) {
    const { child, parent, context, ...dataForSuper } = data;
    
    dataForSuper.from ??= child;
    dataForSuper.to ??= parent;

    super(dataForSuper);

    this.context = context ?? 'url';
    this.assignKey();
  }

  // Only one parent/child relationship per context.
  protected override keySeed(): unknown {
    return { from: this._from, to: this._to, context: this.context };
  }
}

Vertice.types.set('is_child_of', { constructor: IsChildOf, isEdge: true });