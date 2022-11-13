import is from '@sindresorhus/is';
import {Vertice, VerticeData} from './vertice.js';

export interface ResourceData extends VerticeData {
  url?: string | URL;
  code?: number | string;
  message?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
  files?: SavedFile[];
};

export interface SavedFile { bucket: string, filename: string };

export class Resource extends Vertice {
  readonly _collection = 'resources';

  url!: string;
  code!: number;
  message!: string;
  headers: Record<string, string | string[] | undefined>;
  body?: string;
  files!: SavedFile[];

  constructor(data: ResourceData = {}) {
    const {url, code, message, headers, body, files, ...dataForSuper} = data;
    super(dataForSuper);

    // Flatten the URL to a string
    this.url = url?.toString() ?? '';

    // Ensure there's a statuscode for the resource
    if (is.numericString(code)) {
      this.code = Number.parseInt(code, 10);
    } else if (is.number(code)) {
      this.code = code;
    } else {
      this.code = -1;
    }

    this.message = message ?? '';
    this.headers = headers ?? {};
    this.body = body;
    this.files = files ?? [];

    this.assignKey();
  }

  protected override keySeed(): unknown {
    return {url: this.url, label: this.label};
  }
}

Vertice.types.set('resources', {constructor: Resource});
