import { GenericStore } from './generic-storage.js';
import { aql } from 'arangojs';
import { CreateCollectionOptions } from 'arangojs/collection.js';
import { DatasetDataOptions } from 'crawlee';
export { DatasetDataOptions } from 'crawlee';
import _ from 'lodash';

export interface DatasetContent<Data> {
  /** Total count of entries in the dataset. */
  total: number;
  /** Count of dataset entries returned in this set. */
  count: number;
  /** Position of the first returned entry in the dataset. */
  offset: number;
  /** Maximum number of dataset entries requested. */
  limit: number;
  /** Dataset entries based on chosen format parameter. */
  items: Data[];
}

const defaultCreateOptions: CreateCollectionOptions = {
  keyOptions: { allowUserKeys: false },
};

const defaultDataOptions: DatasetDataOptions = {
  clean: true,
};

export class Dataset<
  Data extends Record<string, unknown> = Record<string, unknown>,
> extends GenericStore {
  protected static _prefix = 'ds_';
  protected static datasets = new Map<string, Dataset>();

  static async open<
    Data extends Record<string, unknown> = Record<string, unknown>,
  >(
    name = 'default',
    options: CreateCollectionOptions = {},
  ): Promise<Dataset<Data>> {
    const opt: CreateCollectionOptions = _.defaultsDeep(
      options,
      defaultCreateOptions,
    );
    const cname = this.prefix(name);

    let set = Dataset.datasets.get(cname) as Dataset<Data>;
    if (set !== undefined) return Promise.resolve(set);

    const db = await this.db();
    const collections = await db.listCollections();
    for (const c of collections) {
      if (c.name === cname) {
        set = new Dataset(db.collection(cname));
        Dataset.datasets.set(cname, set);
        return Promise.resolve(set);
      }
    }

    const c = await db.createCollection(cname, opt);
    set = new Dataset(c);
    Dataset.datasets.set(cname, set);
    return Promise.resolve(set);
  }

  static async pushData<
    Data extends Record<string, unknown> = Record<string, unknown>,
  >(data: Data | Data[]) {
    const dataset = await this.open();
    return dataset.pushData(data);
  }

  static async getData<
    Data extends Record<string, unknown> = Record<string, unknown>,
  >(options: DatasetDataOptions = {}): Promise<DatasetContent<Data>> {
    const dataset = await this.open<Data>();
    return dataset.getData(options);
  }

  async pushData(data: Data | Data[]) {
    const items = Array.isArray(data) ? data : [data];
    return this.collection.saveAll(items);
  }

  async getData(
    options: DatasetDataOptions = {},
  ): Promise<DatasetContent<Data>> {
    const opt: DatasetDataOptions = _.defaultsDeep(options, defaultDataOptions);

    const db = await this.db();
    const limit = opt.limit
      ? aql`LIMIT ${opt.offset ?? 0}, ${opt.limit}`
      : undefined;

    const cursor = await db.query<Data>(
      aql`FOR doc IN ${this.collection} ${limit} RETURN doc`,
      { count: true },
    );
    let items: Data[] = [];
    if (opt.clean) {
      items = (await cursor.all()).map(raw => {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (!k.startsWith('_')) clean[k] = v;
        }
        return clean as Data;
      });
    } else {
      items = await cursor.all();
    }

    return Promise.resolve({
      count: cursor.count ?? 0,
      limit: opt.limit ?? 0,
      offset: opt.offset ?? 0,
      total: (await this.collection.count()).count,
      items,
    });
  }
}
