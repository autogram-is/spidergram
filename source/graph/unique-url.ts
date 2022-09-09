import { Node, isNode, Dictionary, Transform, Type } from '@autogram/autograph';
import { NormalizedUrl } from '@autogram/url-tools';

export class UniqueUrl extends Node {
  @Type(() => NormalizedUrl)
  @Transform(
    ({ value }) => new NormalizedUrl(value.href, undefined, (u) => u),
    { toClassOnly: true },
  )
  @Transform(({ value }) => (value as NormalizedUrl).properties, {
    toPlainOnly: true,
  })
  parsed?: NormalizedUrl;

  type = 'unique_url';
  url: string;
  parsable!: boolean;

  constructor(
    url: string | NormalizedUrl,
    public referer = '',
    public depth = 0,
    baseUrl?: string,
    normalizer = NormalizedUrl.normalizer
  ) {
    super('unique_url');
    let data: Dictionary;
    if (typeof url === 'string') {
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
    } else {
      const normalized = new NormalizedUrl(url.href, baseUrl, normalizer);
      this.url = normalized.href;
      this.parsed = normalized;
      this.parsable = true;
    }

    this.assignId();
  }

  protected getIdSeed(): unknown {
    return this.url;
  }

  toString(): string {
    return this.url;
  }
}

Node.types.set('unique_url', UniqueUrl);

export function isUniqueUrl(input: unknown): input is UniqueUrl {
  return isNode(input) && input.type == 'unique_url';
}
