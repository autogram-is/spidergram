import { asJsonMap, isAnyJson } from '@salesforce/ts-types';
import { KeyValueStore } from '../../index.js';

export async function importKvs(
  store: string | KeyValueStore,
  data: unknown,
): Promise<KeyValueStore> {
  const kvs =
    typeof store === 'string' ? await KeyValueStore.open(store) : store;
  if (isAnyJson(data)) {
    const records = asJsonMap(data) ?? {};
    for (const [key, value] of Object.entries(records)) {
      await kvs.setValue(key, value);
    }
  }
  return Promise.resolve(kvs);
}
