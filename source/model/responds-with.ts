import { UniqueUrl } from './unique-url.js';
import { Resource } from './resource.js';
import { Edge, EdgeData } from './edge.js';
import { Vertice, Reference } from './vertice.js';

export type RespondsWithData<F extends Vertice = UniqueUrl, T extends Vertice = Resource> = EdgeData<F, T> & {
  url?: Reference<F>;
  resource?: Reference<T>;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

export class RespondsWith<F extends Vertice = UniqueUrl, T extends Vertice = Resource> extends Edge<F, T> {
  override _collection = 'responds_with';
  method!: string;
  headers!: Record<string, string | string[] | undefined>;

  constructor(data: RespondsWithData<F, T> = {}) {
    const { url, resource, method, headers, ...dataForSuper } = data;
    
    dataForSuper.from ??= url;
    dataForSuper.to ??= resource;

    super(dataForSuper);

    this.method = method ?? 'GET';
    this.headers = headers ?? {};
  }
}

Vertice.types.set('responds_with', { constructor: RespondsWith, isEdge: true });