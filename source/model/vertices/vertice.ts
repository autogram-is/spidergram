/* eslint-disable import/no-unassigned-import */
import 'reflect-metadata';
import is from '@sindresorhus/is';
import {getProperty, setProperty, hasProperty, deleteProperty, deepKeys} from 'dot-prop';
import {
  Exclude,
  plainToInstance,
  instanceToPlain,
  ClassConstructor,
  ClassTransformOptions,
  TargetMap,
} from 'class-transformer';
import {Uuid, UuidFactory} from '../helpers/uuid.js';
import {JsonObject} from 'type-fest';

export {Transform, Exclude} from 'class-transformer';
export type Reference<T extends Vertice = Vertice> = T | [ string, Uuid ] | string;
export type VerticeData = Record<string, unknown>;

export interface CollectionMeta {
  isEdge?: true;
  constructor: ClassConstructor<Vertice>;
}

export function isVertice(value: unknown): value is Vertice {
  return (
    is.object(value)
    && ('_collection' in value)
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
      return r.id;
    }
  }
  
  [property: string]: unknown;
  _key: Uuid = UuidFactory.nil;

  @Exclude({ toPlainOnly: true, toClassOnly: false })
    _id!: string;

  @Exclude({ toPlainOnly: false, toClassOnly: true })
  abstract readonly _collection: string;

  @Exclude({ toPlainOnly: true, toClassOnly: false })
    _rev?: string;

  // The data passed into Vertice constructors should consist of fully
  // instantiated objects of the correct classes; unlike fromJSON(),
  // the constructor isn't expected to coerce or remap incoming values.
  //
  // Subclasses with specific constructor requirements can implement
  // their own interface/type for incoming data, and transform the
  // values before passing them along.
  constructor(data: VerticeData = {}) {
    // Special handling for arbitrary properties.
    if (is.object(data)) {
      for (const k in data) {
        this[k] = data[k];
      }

      this.assignKey();
    }
  }

  /*
   * Hydration/dehydration and serializer code. This is used
   * to ensure that incoming JSON blobs become actual class
   * instances, and that serializing class instances maps
   * everything to the proper Arango properties.
   */

  static getSerializerOptions() {
    const options: ClassTransformOptions = {
      strategy: 'exposeAll',
      excludeExtraneousValues: false,
      excludePrefixes: [],
      targetMaps: [] as TargetMap[],
      enableImplicitConversion: true,
      exposeDefaultValues: true,
      exposeUnsetFields: true,
    };
    return options;
  }

  static fromJSON<T extends typeof Vertice = typeof this>(
    this: T,
    data: string | Record<string, unknown>,
  ): InstanceType<T> {
    const object = (
      typeof data === 'string' ? JSON.parse(data) : data
    ) as Vertice;

    if (isVertice(object)) {
      const ctor = Vertice.types.get(object._collection)?.constructor;
      if (ctor) {
        return plainToInstance(
          ctor,
          object,
          Vertice.getSerializerOptions(),
        ) as InstanceType<T>;
      }
    }

    throw new TypeError('Vertices require collection and key or id');
  }

  toJSON(): JsonObject {
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

  get id(): string {
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
  get(path: string): unknown {
    return getProperty(this, path);
  }

  set(
    path: string,
    value: unknown,
  ) {
    return setProperty(this, path, value);
  }

  has(path: string): boolean {
    return hasProperty(this, path);
  }

  delete(path: string): boolean {
    return deleteProperty(this, path);
  }

  deepKeys(): string[] {
    return deepKeys(this);
  }
}
