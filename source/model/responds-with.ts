import { UniqueUrl } from './unique-url.js';
import { Resource } from './resource.js';
import { Edge, EdgeData } from './edge.js';
import { Vertice, Reference } from './vertice.js';

export type RespondsWithData = {
  url?: Reference<UniqueUrl>;
  resource?: Reference<Resource>;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
} & EdgeData;

export class RespondsWith extends Edge {
  override _collection = 'responds_with';
  url!: string;
  method!: string;
  headers!: Record<string, string | string[] | undefined>;

  constructor(data: RespondsWithData = {}) {
    const { url, resource, method, headers, ...dataForSuper } = data;
    
    dataForSuper.from ??= url;
    dataForSuper.to ??= resource;

    super(dataForSuper);

    this.method = method ?? 'GET';
    this.headers = headers ?? {};
  }
}

Vertice.types.set('responds_with', { constructor: RespondsWith, isEdge: true });