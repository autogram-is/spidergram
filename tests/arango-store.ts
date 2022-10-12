import test from "ava";
import { ArangoStore } from "../source/arango-store.js";
import { UniqueUrl, Resource, RespondsWith, LinksTo } from "../source/model/index.js";

test("spidergraph connection", async (t) => {
  await ArangoStore.open();
  t.assert(ArangoStore.system !== undefined);
});

test("insert", async (t) => {
  const db = await ArangoStore.open('spidergram_inserts');

  const uu = new UniqueUrl({ url: 'http://test.com' });
  await ArangoStore.add(uu, db);

  t.assert(await ArangoStore.db.exists());
});


test("edges", async (t) => {
  const db = await ArangoStore.open('spidergram_inserts');

  const uu = new UniqueUrl({ url: 'http://test.com' });
  const re = new Resource({
    url: 'http://test.com',
    code: 200,
  });
  const rw = new RespondsWith({
    url: uu, 
    resource: re,
    method: 'GET',
    headers: {}
  });
  const lt = new LinksTo({
    url: uu, 
    resource: re,
    href: 'http://test.com',
  });
  const results = await ArangoStore.add([uu, re, rw, lt], db);
  t.assert(results.length > 0);
});