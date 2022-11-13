import {Vertice, isVertice, VerticeData, Reference} from '../vertices/vertice.js';

export function isEdge(value: unknown): value is Edge {
  return (
    isVertice(value)
    && ('_from' in value)
    && ('_to' in value)
  );
}

export interface EdgeData<F extends Vertice = Vertice, T extends Vertice = Vertice> extends VerticeData {
  from?: Reference<F>;
  to?: Reference<T>;
};

export abstract class Edge<F extends Vertice = Vertice, T extends Vertice = Vertice> extends Vertice {
  _from!: string;
  _to!: string;

  // We accept a special-purpose
  constructor(data: EdgeData<F, T> = {}) {
    const {from, to, ...dataForSuper} = data;
    super(dataForSuper);

    if (from) {
      this._from = Vertice.idFromReference(from);
    }

    if (to) {
      this._to = Vertice.idFromReference(to);
    }
    this.assignKey();
  }

  protected override keySeed(): unknown {
    return {
      from: this._from,
      label: this.label,
      to: this._to
    };
  }
}
