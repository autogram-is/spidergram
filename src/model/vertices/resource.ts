import { ParsedUrl } from '@autogram/url-tools';
import is from '@sindresorhus/is';
import {
  Vertice,
  VerticeConstructorOptions,
  Expose,
  Transform,
} from './vertice.js';
import { parse as parseContentType } from 'content-type';
import { SavedFile } from '../index.js';

export interface ResourceConstructorOptions extends VerticeConstructorOptions {
  url?: string | URL;
  code?: number | string;
  message?: string;
  headers?: Record<string, string | string[] | undefined>;
  mime?: string;
  size?: number;
  body?: string;
  payload?: SavedFile;
}

export class Resource extends Vertice {
  readonly _collection = 'resources';

  url!: string;
  code!: number;
  message!: string;
  headers: Record<string, string | string[] | undefined>;
  mime?: string;
  size?: number;
  body?: string;
  payload?: SavedFile;

  constructor(data: ResourceConstructorOptions = {}) {
    const { url, code, message, headers, body, payload, ...dataForSuper } =
      data;
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

    // Pull out content-length and content-type if they exist
    if (headers && is.string(headers?.['content-type'])) {
      this.mime = parseContentType(headers['content-type']).type;
    }

    if (headers && is.numericString(headers?.['content-length'])) {
      this.size = Number.parseInt(headers['content-length']?.toString() ?? '');
    }

    this.message = message ?? '';
    this.headers = headers ?? {};
    this.body = body;
    this.payload = payload;

    this.assignKey();
  }

  @Expose()
  @Transform(transformation => {
    if (transformation.type === 1) {
      return transformation.value
        ? (transformation.value as ParsedUrl).properties
        : undefined;
    } else {
      return transformation;
    }
  })
  get parsed() {
    return new ParsedUrl(this.url);
  }

  protected override keySeed(): unknown {
    return { url: this.url, label: this.label };
  }
}

Vertice.types.set('resources', { constructor: Resource });
