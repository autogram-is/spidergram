import is from '@sindresorhus/is';
import { NormalizedUrl } from '@autogram/url-tools';
import { UniqueUrl } from '../vertices/unique-url.js';
import { UrlMutator } from '@autogram/url-tools/dist/source/mutators.js';
import prependHttp from 'prepend-http';
import { JsonMap } from '@salesforce/ts-types';
import arrify from 'arrify';

type ValidUniqueUrlInput = UniqueUrl | NormalizedUrl | string;

/**
 * Behavioral options for a UniqueUrlSet
 */
export interface UniqueUrlSetOptions {
  /**
   * Keep a list of all URLs that were rejected as unparsable, for later reporting.
   *
   * @type {?boolean}
   */
  keepUnparsable?: boolean;

  /**
   * A UrlMutator function to transform any parsed URLs.
   *
   * NOTE: This function *will not* be applied to NormalizedUrl and UniqueUrl objects,
   * on the assumption that they've both been normalized already.
   *
   * If no Mutator is specified, the default NormalizedUrl.normalizer will be used.
   */
  normalizer?: UrlMutator;

  /**
   * If protocol-less URLs are passed in (www.example.com), automatially prepend
   * 'https' to them.
   */
  guessProtocol?: boolean;

  /**
   * A dictionary of additional data to set on all UniqueUrl objects in the set.
   * This can be useful for bulk-transforming strings to UniqueUrls.
   *
   * NOTE: Values will be overwritten if the keys in userData already exist on
   * the UniqueUrl.
   *
   * @type {?JsonMap}
   */
  userData?: JsonMap;
}

export class UniqueUrlSet extends Set<UniqueUrl> {
  verifier = new Set<string>();
  unparsable = new Set<string>();

  keepUnparsable: boolean;
  normalizer: UrlMutator;
  guessProtocol: boolean;
  userData: JsonMap;

  public constructor(
    input?: ValidUniqueUrlInput[] | ValidUniqueUrlInput,
    options: UniqueUrlSetOptions = {},
  ) {
    super();

    this.keepUnparsable = options.keepUnparsable ?? false;
    this.normalizer = options.normalizer ?? NormalizedUrl.normalizer;
    this.guessProtocol = options.guessProtocol ?? false;
    this.userData = options.userData ?? {};

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
        ...this.userData,
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
        ...this.userData,
      });
    }

    if (input instanceof UniqueUrl) {
      return new UniqueUrl({
        url: input.url,
        normalizer: this.normalizer,
        ...this.userData,
      });
    }

    return input;
  }
}
