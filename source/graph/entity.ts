import is from '@sindresorhus/is';
import { UuidFactory, Uuid } from './uuid.js';
import { getProperty, setProperty, hasProperty, deleteProperty, deepKeys } from './properties.js';

export abstract class Entity {
  collection: string = 'entity';
  protected _key: Uuid = UuidFactory.nil;
  protected _id?: string;
  [property: string]: unknown;

  /*
   * ID and unique key generation functions
   */
  protected uniqueProperties(): unknown {
    return null;
  }

  protected generateKey() {
    this._key = UuidFactory.generate(this.uniqueProperties());
    this.generateId();
  }

  protected generateId() {
    this._id = [this.collection, this.key].join('/');
  }

  get key(): Uuid {
    if (this._key === UuidFactory.nil) {
      this.generateKey();
    }
    return this._key;
  }
  set key(input: Uuid) {
    this._key = input;
  }

  get id(): string {
    if (is.undefined(this._id)) {
      this.generateId();
    }
    return this._id!;
  }

  /* 
   * Path-based property access functions
   */

  get(path: string): unknown {
    return getProperty(this, path);
  }

  set(path: string, value: unknown) {
    setProperty(this, path, value);
  }

  has(path: string): boolean {
    return hasProperty(this, path);
  }

  delete(path: string): boolean {
    return deleteProperty(this, path);
  }

  keys(): string[] {
    return deepKeys(this);
  }
}