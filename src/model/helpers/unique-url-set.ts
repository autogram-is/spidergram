import is from '@sindresorhus/is';
import { NormalizedUrl } from '@autogram/url-tools';
import { UniqueUrl } from '../vertices/unique-url.js';
import { UrlMutator } from '@autogram/url-tools/dist/source/mutators.js';
import prependHttp from 'prepend-http';
import arrify from 'arrify';

type ValidUniqueUrlInput = UniqueUrl | NormalizedUrl | string

export interface UniqueUrlSetOptions {
  keepUnparsable?: boolean;
  normalizer?: UrlMutator;
  guessProtocol?: boolean;
}

export class UniqueUrlSet extends Set<UniqueUrl> {
  verifier = new Set<string>();
  unparsable = new Set<string>();

  keepUnparsable: boolean;
  normalizer: UrlMutator;
  guessProtocol: boolean;

  public constructor(
    input?: ValidUniqueUrlInput[] | ValidUniqueUrlInput,
    options: UniqueUrlSetOptions = {}
  ) {
    super();
    
    this.keepUnparsable = options.keepUnparsable ?? false;
    this.normalizer = options.normalizer ?? NormalizedUrl.normalizer;
    this.guessProtocol = options.guessProtocol ?? false;

    this.addItems(arrify(input));
  }

  override add(value: ValidUniqueUrlInput): this {
    const uu = this.parse(value);
    if (uu) {
      super.add(uu);
      this.verifier.add(uu.key);
    } else {
      this.unparsable.add(value as string);
    }

    return this;
  }

  override has(value: ValidUniqueUrlInput): boolean {
    const uu = this.parse(value);
    if (uu) {
      return this.verifier.has(uu.key);
    }

    return false;
  }

  override delete(value: ValidUniqueUrlInput): boolean {
    const uu = this.parse(value);
    if (uu) {
      this.verifier.delete(uu.key);
      for (const u of this) {
        if (u.key === uu.key) {
          super.delete(u);
        }
      }

      return true;
    }

    return false;
  }

  override clear(): void {
    this.verifier.clear();
    this.unparsable.clear();
    super.clear();
  }

  addItems(values: ValidUniqueUrlInput[]): this {
    for (const v of values) {
      this.add(v);
    }

    return this;
  }

  protected parse(input: ValidUniqueUrlInput): UniqueUrl | false {
    if (is.nonEmptyStringAndNotWhitespace(input)) {
      input = new UniqueUrl({
        url: this.guessProtocol ? prependHttp(input) : input,
        normalizer: this.normalizer,
      });
      if (input.parsable || this.keepUnparsable) {
        return input;
      }

      this.unparsable.add(input.url);
      return false;
    }

    if (is.urlInstance(input)) {
      return new UniqueUrl({
        url: input,
        normalizer: this.normalizer,
      });
    }

    if (input instanceof UniqueUrl) {
      return new UniqueUrl({
        url: input.url,
        normalizer: this.normalizer,
      });
    }

    return input;
  }
}
