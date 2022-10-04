import test from "ava";
import { Arango } from "../source/arango.js";
import { UniqueUrl } from "../source/model/index.js";

test("spidergraph connection", async (t) => {
  const g = new Arango('spidergram');
  t.assert(await g.db.exists());
});

test("insert", async (t) => {
  const a = new Arango('test');
  const uu = new UniqueUrl({ url: 'http://test.com' });
  a.add(uu);
  t.assert(await a.db.exists());
});


