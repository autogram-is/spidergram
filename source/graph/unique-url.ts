import { Node, Dictionary, Transform, Type } from '@autogram/autograph';
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
  ) {
    super('unique_url');
    let data: Dictionary;
    if (typeof url === 'string') {
      try {
        const parsed = new NormalizedUrl(url, baseUrl);
        this.url = parsed.href;
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
      this.url = url.href;
      this.pared = url;
      this.parsable = true;
    }

    this.assignId();
  }

  protected getIdSeed(): unknown {
    return this.url;
  }
}

Node.types.set('unique_url', UniqueUrl);
