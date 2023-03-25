import { isValidKey } from './arango-store.js';
import { GenericStore } from './generic-storage.js';
import { CreateCollectionOptions } from 'arangojs/collection.js';
import _ from 'lodash';

const defaultCreateOptions: CreateCollectionOptions = {
  keyOptions: { type: 'uuid' },
};

export class KeyValueStore extends GenericStore {
  protected static _prefix = 'kv_';
  protected static kvstores = new Map<string, KeyValueStore>();

  static async open(
    name = 'default',
    options: CreateCollectionOptions = {},
  ): Promise<KeyValueStore> {
    const opt: CreateCollectionOptions = _.defaultsDeep(
      options,
      defaultCreateOptions,
    );
    const cname = this.prefix(name);
    let set = KeyValueStore.kvstores.get(cname);
    if (set !== undefined) return Promise.resolve(set);

    const db = await this.db();
    const collections = await db.listCollections();
    for (const c of collections) {
      if (c.name === cname) {
        set = new KeyValueStore(db.collection(cname));
        KeyValueStore.kvstores.set(cname, set);
        return Promise.resolve(set);
      }
    }

    const c = await db.createCollection(cname, opt);
    set = new KeyValueStore(c);
    KeyValueStore.kvstores.set(cname, set);
    return Promise.resolve(set);
  }

  static async setValue<T>(key: string, value: T) {
    const store = await this.open();
    return store.setValue(key, value);
  }

  static async getValue<T = unknown>(key: string): Promise<T | undefined>;
  static async getValue<T = unknown>(key: string, defaultValue: T): Promise<T>;
  static async getValue<T = unknown>(
    key: string,
    defaultValue?: T,
  ): Promise<T | undefined> {
    const store = await this.open();
    return store.getValue<T>(key, defaultValue as T);
  }

  async setValue<T>(key: string, value: T) {
    if (!isValidKey(key)) throw new TypeError('Invalid key');
    const data = { _key: key, value };
    return this.collection.save(data, { overwriteMode: 'replace' });
  }

  async unsetValue(key: string) {
    if (!isValidKey(key)) throw new TypeError('Invalid key');
    return this.collection.remove({ _key: key });
  }

  async getValue<T = unknown>(key: string): Promise<T | undefined>;
  async getValue<T = unknown>(key: string, defaultValue: T): Promise<T>;
  async getValue<T = unknown>(
    key: string,
    defaultValue?: T,
  ): Promise<T | undefined> {
    if (!isValidKey(key)) throw new TypeError('Invalid key');
    const record = await this.collection.document(key, { graceful: true });
    return (record?.value as T) ?? defaultValue ?? undefined;
  }
}
