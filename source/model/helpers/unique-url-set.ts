import is from '@sindresorhus/is';
import {
  NormalizedUrl,
} from '@autogram/url-tools';
import { UniqueUrl } from '../vertices/unique-url.js';

type ValidUniqueUrlInput = UniqueUrl | NormalizedUrl | string;
export class UniqueUrlSet extends Set<UniqueUrl> {
  verifier = new Set<string>();
  unparsable = new Set<string>();

  public constructor(
    input?: ValidUniqueUrlInput[],
    public keepUnparsable: boolean = true,
    public normalizer = NormalizedUrl.normalizer,
  ) {
    super();
    if (is.nonEmptyArray(input)) this.addItems(input);
  }

  override add(value: ValidUniqueUrlInput): this {
    const uu = this.parse(value);
    if (uu) {
      super.add(uu);
      this.verifier.add(uu.id);
    } else {
      this.unparsable.add(value as string);
    }

    return this;
  }

  override has(value: ValidUniqueUrlInput): boolean {
    const uu = this.parse(value);
    if (uu) {
      return this.verifier.has(uu.id);
    }

    return false;
  }

  override delete(value: ValidUniqueUrlInput): boolean {
    const uu = this.parse(value);
    if (uu) {
      this.verifier.delete(uu.id);
      for (const u of this) {
        if (u.id === uu.id) super.delete(u);
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
        url: input,
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

    return input;
  }
}
