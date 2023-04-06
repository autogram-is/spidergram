import { ParsedUrl } from '@autogram/url-tools';
import is from '@sindresorhus/is';
import {
  Entity,
  EntityConstructorOptions,
  Expose,
  Transform,
} from './entity.js';
import { parse as parseContentType } from 'content-type';
import { KeyValueStore, SavedFile } from '../index.js';
import { Spidergram } from '../../config/spidergram.js';
import path from 'path';
import { sha1 } from 'object-hash';

export interface ResourceConstructorOptions extends EntityConstructorOptions {
  url?: string | URL;
  code?: number | string;
  message?: string;
  headers?: Record<string, string | string[] | undefined>;
  mime?: string;
  size?: number;
  body?: string;
  cookies?: Record<string, string | number | boolean>[];
  payload?: SavedFile;
}

export class Resource extends Entity {
  static offloadBodyHtml?: 'db' | 'file';

  readonly _collection = 'resources';

  url!: string;
  code!: number;
  message!: string;
  headers: Record<string, string | string[] | undefined>;
  mime?: string;
  size?: number;
  cookies?: Record<string, string | number | boolean>[];
  payload?: SavedFile;

  // Hide this property from the serializer if
  @Transform(transformation => {
    if (transformation.type === 1 && Resource.offloadBodyHtml) {
      return undefined;
    } else {
      return transformation.value;
    }
  })
  body?: string;

  // This property is only used when the `offloadBodyHtml` mode has been set.
  // The hash is read in when loaded, and before saving the HTML the hash is
  // compared to the hash of the 'current' HTML. If they match, no attempt is
  // made to re-save the body html.
  _bodyHash?: string;

  constructor(data: ResourceConstructorOptions = {}) {
    const {
      url,
      code,
      cookies,
      message,
      headers,
      body,
      payload,
      ...dataForSuper
    } = data;
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
    this.cookies = cookies;
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

  /**
   * In certain situations, it's useful to offload storage of body
   * text to a separate table rather than keeping it in the Resource
   * proper.
   *
   * If you need to work directly with a resource's HTML, call:
   * `await r.loadBody()` after loading and `await r.saveBody()` just
   * before persisting it.
   *
   * This is wonky. We don't like it. It's only really necessary when
   * you're offloading the HTML — in other situations, things should work
   * without it.
   */
  async loadBody(): Promise<this> {
    if (Resource.offloadBodyHtml === undefined) {
      // No operation; normal body handling in effect
    } else if (typeof this.body === 'string' && this.body.length > 0) {
      // No operation; body already loaded
    } else if (Resource.offloadBodyHtml === 'db') {
      this.body = await KeyValueStore.open('body_html').then(kv =>
        kv.getValue(this.key),
      );
      this._bodyHash = sha1({ html: this.body });
    } else if (Resource.offloadBodyHtml === 'file') {
      const bodyPath = path.join('body_html', `${this.key}.html`);
      this.body = await Spidergram.load()
        .then(sg => sg.files().read(bodyPath))
        .then(buffer => buffer.toString())
        .catch(error => (error instanceof Error ? error.message : undefined));
      this._bodyHash = sha1({ html: this.body });
    }

    return Promise.resolve(this);
  }

  async saveBody(): Promise<this> {
    if (
      Resource.offloadBodyHtml === undefined ||
      this.body === undefined ||
      this.body.length === 0
    ) {
      // No operation; body is empty
    } else if (Resource.offloadBodyHtml === 'db') {
      const freshHash = sha1({ html: this.body });
      if (this._bodyHash !== freshHash) {
        await KeyValueStore.open('body_html').then(kv =>
          kv.setValue(this.key, this.body ?? ''),
        );
        this._bodyHash = freshHash;
      }
    } else if (Resource.offloadBodyHtml === 'file') {
      const bodyPath = path.join('body_html', `${this.key}.html`);
      const freshHash = sha1({ html: this.body });
      if (this._bodyHash !== freshHash) {
        await Spidergram.load()
          .then(sg => sg.files().write(bodyPath, Buffer.from(this.body ?? '')))
          .then(() => true)
          .catch(() => false);
        this._bodyHash = freshHash;
      }
    }

    return Promise.resolve(this);
  }
}

Entity.types.set('resources', { constructor: Resource });
