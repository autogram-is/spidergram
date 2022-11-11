import {v4 as uuidv4, v5 as uuidv5, NIL as NilUuid, validate} from 'uuid';
import hash from 'object-hash';
import is from '@sindresorhus/is';

interface Flavoring<FlavorT> {
  _flavor?: FlavorT;
}
type Flavor<T, FlavorT> = T & Flavoring<FlavorT>;

export type Uuid = Flavor<string, 'uuid'>;

export const UuidFactory = {
  namespace: '9fc3e7e5-59d7-4d55-afa0-98a978f49bab' as Uuid,
  nil: NilUuid as Uuid,

  /**
   * Given an input value, generates a Uuid that serves as a hash for the object.
   * If no input is given, generates a random Uuid.
   *
   * @static
   * @param {?unknown} [hashValue]
   * @returns {Uuid}
   */
  generate(hashValue?: unknown): Uuid {
    if (hashValue) {
      if (!is.object(hashValue)) {
        hashValue = {data: hashValue};
      }

      const hashOutput = hash(hashValue as Record<string, unknown>, {encoding: 'buffer'});
      return uuidv5(hashOutput, UuidFactory.namespace) as Uuid;
    }

    return uuidv4() as Uuid;
  },

  isUuid(input: string): input is Uuid {
    return validate(input);
  },
};
