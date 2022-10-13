import is from '@sindresorhus/is';
import { URL } from 'node:url';
import { NormalizedUrl, UrlMutator } from '@autogram/url-tools';
import { Vertice, VerticeData, Transform } from './vertice.js';

export type UniqueUrlData = {
  url?: string | NormalizedUrl;
  base?: string | URL;
  normalizer?: UrlMutator;
  referer?: string;
  depth?: number;
} & VerticeData;

export class UniqueUrl extends Vertice {
  override _collection = 'unique_urls';
  url!: string;

  @Transform((transformation) => {
    if (transformation.type === 1) {
      // Class to plain
      return transformation.value ? (transformation.value as NormalizedUrl).properties : undefined;
    } else {
      // Plain to class
      if (transformation.value) { 
        const n = new NormalizedUrl(transformation.value, undefined, (u) => u);
        if ('original' in transformation.value) {
          n.original = transformation.value.original as string;
        }
        return n;
      }
      return transformation.value;
    }
  })
  parsed?: NormalizedUrl;
  referer?: string;
  depth!: number;

  protected override keySeed(): unknown {
    return { url: this.url }
  }

  get sortableComponents(): string[] {
    const url = this.parsed;
    if (url === undefined) {
      return ['unparsable', this.url];
    } else {
      let components = [
        url.protocol.replace(':', ''),
        url.subdomain,
        url.domain.replace('/', ''),
      ];
      if (is.nonEmptyArray(url.path)) {
        components = [...components, ...url.path];
      }
      if (is.nonEmptyStringAndNotWhitespace(url.search)) {
        components.push(url.search);
      }
      if (is.nonEmptyStringAndNotWhitespace(url.hash)) {
        components.push(url.hash);
      }
      return components;
    }
  }
  
  get sortableString(): string {
    return this.sortableComponents.join('/');
  }

  get parsable(): boolean {
    return this.parsed !== undefined;
  }

  constructor(data: UniqueUrlData = {}) {
    let { url, base, normalizer, referer, depth, ...dataForSuper } = data;
    super(dataForSuper);

    if (is.urlInstance(base)) base = base.toString();
    if (is.string(url)) {
      try {
        this.parsed = new NormalizedUrl(url, base, normalizer);
        this.url = this.parsed.href;
      } catch (error: unknown) {
        console.log(`${url} not parsable`);
      }
    } else if (url instanceof NormalizedUrl) {
      this.parsed = url;
      this.url = url.href;
    }

    this.depth = depth ?? 0;
    this.referer = referer;

    this.assignKey();
  }
}

Vertice.types.set('unique_urls', { constructor: UniqueUrl });