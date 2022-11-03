import is from '@sindresorhus/is';
import {Vertice, VerticeData} from './vertice.js';

export type ResourceData = {
  url?: string | URL;
  code?: number | string;
  message?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
  payload?: string;
} & VerticeData;

export class Resource extends Vertice {
  get _collection() {
    return 'resources';
  }

  url!: string;
  code!: number;
  message!: string;
  headers!: Record<string, string | string[] | undefined>;
  body?: string;
  payload?: string;

  constructor(data: ResourceData = {}) {
    const {url, code, message, headers, body, payload, ...dataForSuper} = data;
    super(dataForSuper);

    // Flatten the URL to a string
    this.url = url?.toString() ?? '';

    // Ensure there's a statuscode for the resource
    if (is.numericString(code)) {
      this.code = Number.parseInt(code);
    } else if (is.number(code)) {
      this.code = code;
    } else {
      this.code = -1;
    }

    // Default the message and headers
    this.message = message ?? '';
    this.headers = headers ?? {};
    this.body = body;
    this.payload = payload;
  }
}

Vertice.types.set('resources', {constructor: Resource});
