import test from "ava";
import { UniqueUrl } from '../source/model/unique-url.js';

test("load a vertice", async (t) => {
  const uu = new UniqueUrl({ url: 'https://www.test.com', random: 'testing' });
  const json = uu.toJSON();
  const uu2 = UniqueUrl.fromJSON(json);

  console.log(json);
  t.deepEqual(uu, uu2);
});