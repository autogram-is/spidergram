import {
  Edge,
  EdgeConstructorOptions,
  Vertice,
  Reference,
  UniqueUrl,
  Resource,
} from '../index.js';

export interface RespondsWithConstructorOptions<
  F extends Vertice = UniqueUrl,
  T extends Vertice = Resource,
> extends EdgeConstructorOptions<F, T> {
  url?: Reference<F>;
  resource?: Reference<T>;
  redirects?: URL[] | string[];
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export class RespondsWith<
  F extends Vertice = UniqueUrl,
  T extends Vertice = Resource,
> extends Edge<F, T> {
  readonly _collection = 'responds_with';
  method!: string;
  headers!: Record<string, string | string[] | undefined>;
  redirects!: string[];

  constructor(data: RespondsWithConstructorOptions<F, T> = {}) {
    const { url, resource, method, redirects, headers, ...dataForSuper } = data;

    dataForSuper.from ??= url;
    dataForSuper.to ??= resource;

    super(dataForSuper);

    this.method = method ?? 'UNKNOWN';
    this.headers = headers ?? {};
    this.redirects = redirects?.map(url => url.toString()) ?? [];
  }
}

Vertice.types.set('responds_with', { constructor: RespondsWith, isEdge: true });
