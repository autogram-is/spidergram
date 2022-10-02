import is from '@sindresorhus/is';
import { Node, isNode, Dictionary, Transform, Type } from '@autogram/autograph';
import { NormalizedUrl } from '@autogram/url-tools';

export class UniqueUrl extends Node {
  @Transform(
    ({ value }) => {
      try {
        return new NormalizedUrl(value.href, undefined, (u) => u);
      } catch {
        return undefined;
      }
    },
    { toClassOnly: true },
  )
  @Transform(({ value }) => {
    return (value as NormalizedUrl).properties
  }, {
    toPlainOnly: true,
  })
  @Type(() => NormalizedUrl)
  parsed?: NormalizedUrl;

  type = 'unique_url';
  url!: string;
  parsable!: boolean;

  constructor(
    url: string | NormalizedUrl,
    public referer = '',
    public depth = 0,
    baseUrl?: string,
    normalizer = NormalizedUrl.normalizer,
  ) {
    super('unique_url');
    if (is.string(url)) {
      try {
        const parsed = new NormalizedUrl(url, baseUrl, normalizer);
        this.url = parsed.href;
        this.parsed = parsed;
        this.parsable = true;
      } catch (error: unknown) {
        if (error instanceof TypeError) {
          this.url = url;
          this.parsable = false;
        } else {
          throw error;
        }
      }
    } else if (is.urlInstance(url)) {
      const normalized = new NormalizedUrl(url.href, baseUrl, normalizer);
      this.url = normalized.href;
      this.parsed = normalized;
      this.parsable = true;
    }
    else {
      this.parsable = false;
    }

    this.assignId();
  }

  toString(): string {
    return this.url;
  }

  protected getIdSeed(): unknown {
    return this.url;
  }
}

Node.types.set('unique_url', UniqueUrl);

export function isUniqueUrl(input: unknown): input is UniqueUrl {
  return isNode(input) && input.type === 'unique_url';
}
