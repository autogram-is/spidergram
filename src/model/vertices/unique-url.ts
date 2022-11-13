import {URL} from 'node:url';
import is from '@sindresorhus/is';
import {NormalizedUrl, UrlMutator} from '@autogram/url-tools';
import {Vertice, VerticeData, Transform} from './vertice.js';

export interface UniqueUrlData extends VerticeData {
  url?: string | NormalizedUrl;
  source?: UrlSource;
  base?: string | URL;
  normalizer?: UrlMutator;
  referer?: string;
  depth?: number;
};

export enum UrlSource {
  Page = 'page',
  Sitemap = 'sitemap',
  Import = 'import',
  Path = 'path',
}

export class UniqueUrl extends Vertice {
  readonly _collection = 'unique_urls';
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
  source?: UrlSource;
  depth!: number;

  protected override keySeed(): unknown {
    return {url: this.url};
  }

  get parsable(): boolean {
    return this.parsed !== undefined;
  }

  constructor(data: UniqueUrlData = {}) {
    let {url, base, normalizer, referer, depth, ...dataForSuper} = data;
    super(dataForSuper);

    if (is.urlInstance(base)) {
      base = base.toString();
    }

    if (is.string(url)) {
      try {
        this.parsed = new NormalizedUrl(url, base, normalizer);
        this.url = this.parsed.href;
      } catch {
        // Not parsable, but we're okay with that.
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

Vertice.types.set('unique_urls', {constructor: UniqueUrl});
