import { Vertice, isVertice, VerticeData, Reference } from './vertice.js';

export function isEdge(value: unknown): value is Edge {
  return (
    isVertice(value) &&
    ('_from' in value) &&
    ('_to' in value)
  );
}

export type EdgeData = {
  from?: Reference;
  to?: Reference;
} & VerticeData;

export abstract class Edge extends Vertice {
  _from!: string;
  _to!: string;

  // We accept a special-purpose 
  constructor(data: EdgeData = {}) {
    const { from, to, ...dataForSuper } = data;
    super(dataForSuper);

    if (from) {
      this._from = Vertice.idFromReference(from);
    }
    if (to) {
      this._to = Vertice.idFromReference(to);
    }
  }
}