import 'reflect-metadata';
import is from '@sindresorhus/is';
import {
  Exclude,
  plainToInstance,
  instanceToPlain,
  ClassConstructor,
  ClassTransformOptions,
  TargetMap,
} from 'class-transformer';
import { Uuid, UuidFactory } from '../helpers/uuid.js';
import { ensureJsonMap, JsonMap, has } from '@salesforce/ts-types';
import _ from 'lodash';

export { Transform, Exclude, Expose } from 'class-transformer';
export type Reference<T extends Vertice = Vertice> =
  | T
  | [string, Uuid]
  | string;

export interface VerticeConstructorOptions extends Record<string, unknown> {
  label?: string;
}

export interface CollectionMeta {
  isEdge?: true;
  constructor: ClassConstructor<Vertice>;
}

export function isVertice(value: unknown): value is Vertice {
  return (
    is.object(value) &&
    ('_id' in value || ('_collection' in value && '_key' in value))
  );
}

export abstract class Vertice {
  static readonly types = new Map<string, CollectionMeta>();

  static idFromReference(r: Reference): string {
    if (is.string(r)) {
      if (r.includes('/')) {
        return r;
      }

      throw new TypeError('Vertice ID must include collection');
    } else if (is.array(r)) {
      return r.join('/');
    } else {
      return r.documentId;
    }
  }

  [property: string]: unknown;
  _key: Uuid = UuidFactory.nil;
  _collection!: string;
  _id!: string;

  @Exclude({ toClassOnly: true })
  _rev?: string;

  label?: string;

  constructor(data: VerticeConstructorOptions = {}) {
    // Special handling for arbitrary properties.
    for (const k in data) {
      this[k] = data[k];
    }

    this.assignKey();
  }

  /*
   * Hydration/dehydration and serializer code. This is used
   * to ensure that incoming JSON blobs become actual class
   * instances, and that serializing class instances maps
   * everything to the proper Arango properties.
   */

  protected static getSerializerOptions() {
    const options: ClassTransformOptions = {
      strategy: 'exposeAll',
      excludeExtraneousValues: false,
      targetMaps: [] as TargetMap[],
      enableImplicitConversion: true,
      exposeDefaultValues: true,
      exposeUnsetFields: true,
    };
    return options;
  }

  static fromJSON<T extends typeof Vertice = typeof this>(
    this: T,
    data: string | JsonMap,
  ): InstanceType<T> {
    const object =
      typeof data === 'string' ? ensureJsonMap(JSON.parse(data)) : data;

    if (has(object, ['_collection'])) {
      const ctor = Vertice.types.get(object._collection as string)?.constructor;
      if (ctor) {
        return plainToInstance(
          ctor,
          object,
          Vertice.getSerializerOptions(),
        ) as InstanceType<T>;
      }
    }

    throw new TypeError('Vertice data has no _collection property');
  }

  toJSON(): JsonMap {
    return instanceToPlain(this, Vertice.getSerializerOptions());
  }

  serialize(): string {
    return JSON.stringify(this.toJSON(), undefined, 0);
  }

  /**
   * Key and ID management; child classes can override keySeed()
   * if they need to ensure uniqueness based on other properties.
   * Leave it as for a random Uuid key; return a dictionary of
   * prop names and values for a Uuid-shaped hash.
   */

  protected assignKey(): void {
    this._key = UuidFactory.generate(this.keySeed());
  }

  protected keySeed(): unknown {
    return null;
  }

  get key(): string {
    if (this._key === UuidFactory.nil) {
      this.assignKey();
    }

    return this._key;
  }

  get documentId(): string {
    if (is.undefined(this._id)) {
      return [this._collection, this.key].join('/');
    }

    return this._id;
  }

  /*
   * Blind property access; these are used to get, set, and check
   * arbitarily deep property values by path, useful for making
   * deep property references in reporting scripts.
   */
  get(path: string, fallback: undefined) {
    return _.get(this, path, fallback);
  }

  set(path: string, value: unknown) {
    return _.set(this, path, value);
  }

  has(path: string): boolean {
    return _.has(this, path);
  }

  delete(path: string): boolean {
    return _.unset(this, path);
  }
}
