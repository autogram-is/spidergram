import is from '@sindresorhus/is';
import { Vertice, VerticeData } from './vertice.js';

export type ResourceData = {
  url?: string | URL;
  code?: number | string;
  message?: string;
  headers?: Record<string, string | string[]>;
  body?: string;
} & VerticeData;

export class Resource extends Vertice {
  override _collection = 'resources';
  url!: string;
  code!: number;
  message!: string;
  headers!: Record<string, string | string[]>;
  body?: string;

  constructor(data: ResourceData = {}) {
    const { url, code, message, headers, body, ...dataForSuper } = data;
    super(dataForSuper);

    // Flatten the URL to a string
    this.url = url?.toString() ?? '';

    // Ensure there's a statuscode for the resource
    if (is.undefined(code)) {
      this.code = -1;
    } else if (is.string(code)) {
      this.code = Number.parseInt(code);
    }

    // Default the message and headers
    this.message = message ?? '';
    this.headers = headers ?? {};
    this.body = body;
  }
}

Vertice.types.set('resources', { constructor: Resource });