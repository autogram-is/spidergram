import { NormalizedUrl } from '@autogram/url-tools';
import { UniqueUrl } from './unique-url.js';

type ValidUniqueUrlInput = UniqueUrl | NormalizedUrl | string;

export class UniqueUrlSet extends Set<UniqueUrl> {
  verifier = new Set<string>();
  unparsable = new Set<string>();
  keepUnparsable = false;

  public constructor(keepUnparsable: boolean);
  public constructor(values: ValidUniqueUrlInput[]);
  public constructor(
    values?: ValidUniqueUrlInput[] | boolean,
    keepUnparsable = false,
  ) {
    super();
    if (keepUnparsable) this.keepUnparsable = keepUnparsable;
    if (values !== undefined && typeof values !== 'boolean')
      this.addItems(values);
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
    if (typeof input === 'string') {
      input = new UniqueUrl(input);
      if (input.parsable || this.keepUnparsable) {
        return input;
      }

      this.unparsable.add(input.url);
      return false;
    }

    if (input instanceof URL) {
      return new UniqueUrl(input.href);
    }

    if (input instanceof NormalizedUrl) {
      return new UniqueUrl(input);
    }

    return input;
  }
}
