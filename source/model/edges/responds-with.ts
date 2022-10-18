import { Edge, EdgeData, Vertice, Reference, UniqueUrl, Resource } from '../index.js';
export type RespondsWithData<F extends Vertice = UniqueUrl, T extends Vertice = Resource> = EdgeData<F, T> & {
  url?: Reference<F>;
  resource?: Reference<T>;
  redirects?: URL[] | string[];
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

export class RespondsWith<F extends Vertice = UniqueUrl, T extends Vertice = Resource> extends Edge<F, T> {
  override _collection = 'responds_with';
  method!: string;
  headers!: Record<string, string | string[] | undefined>;
  redirects!: string[];

  constructor(data: RespondsWithData<F, T> = {}) {
    const { url, resource, method, redirects, headers, ...dataForSuper } = data;
    
    dataForSuper.from ??= url;
    dataForSuper.to ??= resource;

    super(dataForSuper);

    this.method = method ?? 'GET';
    this.headers = headers ?? {};
    this.redirects = redirects?.map(url => url.toString()) ?? [];
  }
}

Vertice.types.set('responds_with', { constructor: RespondsWith, isEdge: true });