import is from '@sindresorhus/is';
import { UniqueUrl } from './unique-url.js';
import { Resource } from './resource.js';
import { Edge, EdgeData } from './edge.js';
import { Vertice, Reference } from './vertice.js';

export type RespondsWithData = {
  url?: Reference<UniqueUrl>;
  resource?: Reference<Resource>;
  code?: number | string;
  message?: string;
  headers?: Record<string, string | string[]>;
} & EdgeData;

export class RespondsWith extends Edge {
  override _collection = 'responds_with';
  url!: string;
  code!: number;
  message!: string;
  headers!: Record<string, string | string[]>;

  constructor(data: RespondsWithData = {}) {
    const { url, resource, code, message, headers, ...dataForSuper } = data;
    
    dataForSuper.from ??= url;
    dataForSuper.to ??= resource;

    super(dataForSuper);

    this.message = message ?? '';
    this.headers = headers ?? {};

    if (is.undefined(code)) {
      this.code = -1;
    } else if (is.string(code)) {
      this.code = Number.parseInt(code);
    }
  }
}

Vertice.types.set('responds_with', RespondsWith);