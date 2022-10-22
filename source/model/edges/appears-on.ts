import {Edge, EdgeData, Vertice, Reference, Resource} from '../index.js';

export type AppearsOnData<F extends Vertice = Vertice, T extends Vertice = Resource> = EdgeData<F, T> & {
  item?: Reference<F>;
  location?: Reference<T>;
  context?: string;
};

export class AppearsOn<F extends Vertice = Vertice, T extends Vertice = Resource> extends Edge<F, T> {
  override readonly _collection = 'appears_on';
  context!: string;

  constructor(data: AppearsOnData<F, T> = {}) {
    const {item, location, context, ...dataForSuper} = data;

    dataForSuper.from ??= item;
    dataForSuper.to ??= location;

    super(dataForSuper);

    this.context = context ?? 'pattern';
  }
}

Vertice.types.set('appears_on', {constructor: AppearsOn, isEdge: true});
