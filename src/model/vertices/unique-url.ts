import { URL } from 'node:url';
import is from '@sindresorhus/is';
import { NormalizedUrl, UrlMutators } from '@autogram/url-tools';
import { Vertice, VerticeConstructorOptions, Transform } from './vertice.js';

export interface UniqueUrlConstructorOptions extends VerticeConstructorOptions {
  /**
   * The URL to be saved. If the URL is a string, it will be parsed and normalized
   * using the specified normalizer function, or the global one if none is passed in.
   * If a full NormalizedUrl object is passed in, no additional normalization will
   * be performed.
   *
   * @type {?(string | NormalizedUrl)}
   */
  url?: string | NormalizedUrl;

  /**
   * If a relative URL string is passed in, this value will be used to construct
   * an absolute URL during parsing.
   */
  base?: string | URL;
  
  /**
   * An optional URL normalizer that can override the project-wide default.
   * Be aware that changing normalizers mid-project may result in duplicate
   * data.
   */
  normalizer?: UrlMutators.UrlMutator;

  /**
   * The location of the page where this URL was found; it may be used during
   * crawl processes to create a more realistic HTTP request. 
   */
  referer?: string;

  /**
   * The crawl depth the URL was found at. if a sitemap was used to pre-populate
   * the crawl request queue, this value will be less useful.
   */
  depth?: number;

  /**
   * Optional enum indicating the origin of this URL. Was it found while crawling,
   * imported from a third-party data source, extrapolated from the existence of 
   * other URLs, etc.
   *
   * @type {?UrlSource}
   */
  source?: UrlSource;

  /**
   * An optional hint that will be passed on to the crawler as a Request Label,
   * which ultimately controls the handler function that will process the URL's
   * response.
   * 
   * By default, Spidergram will correctly handle the following values:
   * 
   * - status
   * - page
   * - download
   * - robotsxml
   * - sitemap
   *
   * @type {?string}
   */
  handler?: string;
}

export enum UrlSource {
  Page = 'page',
  Sitemap = 'sitemap',
  Import = 'import',
  Path = 'path',
}

export class UniqueUrl extends Vertice {
  readonly _collection = 'unique_urls';
  url!: string;

  @Transform(transformation => {
    if (transformation.type === 1) {
      // Class to plain
      return transformation.value
        ? (transformation.value as NormalizedUrl).properties
        : undefined;
    } else {
      // Plain to class
      if (transformation.value) {
        const n = new NormalizedUrl(transformation.value, undefined, u => u);
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
  handler?: string;
  depth!: number;

  protected override keySeed(): unknown {
    return { url: this.url };
  }

  get parsable(): boolean {
    return this.parsed !== undefined;
  }

  constructor(data: UniqueUrlConstructorOptions = {}) {
    const { url, base, normalizer, referer, handler, depth, ...dataForSuper } = data;
    
    super(dataForSuper);

    let baseUrl = base;
    if (is.urlInstance(baseUrl)) {
      baseUrl = baseUrl.toString();
    }

    if (is.string(url)) {
      try {
        this.parsed = new NormalizedUrl(url, baseUrl, normalizer);
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
    this.handler = handler;

    this.assignKey();
  }
}

Vertice.types.set('unique_urls', { constructor: UniqueUrl });
