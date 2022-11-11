import {Edge, EdgeData, Vertice, Reference, Resource} from '../index.js';

export interface AppearsOnData<F extends Vertice = Vertice, T extends Vertice = Resource> extends EdgeData<F, T> {
  item?: Reference<F>;
  location?: Reference<T>;
  label?: string;
};

export class AppearsOn<F extends Vertice = Vertice, T extends Vertice = Resource> extends Edge<F, T> {
  readonly _collection = 'appears_on';

  constructor(data: AppearsOnData<F, T> = {}) {
    const {item, location, ...dataForSuper} = data;

    dataForSuper.from ??= item;
    dataForSuper.to ??= location;

    super(dataForSuper);
  }
}

Vertice.types.set('appears_on', {constructor: AppearsOn, isEdge: true});
