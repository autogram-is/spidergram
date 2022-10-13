import test from "ava";
import { ArangoStore } from "../source/arango-store.js";
import { UniqueUrl, Resource, RespondsWith, LinksTo } from "../source/model/index.js";

test("spidergraph connection", async (t) => {
  await ArangoStore.open();
  t.assert(ArangoStore.system !== undefined);
});

test("insert", async (t) => {
  const ast = await ArangoStore.open('spidergram_inserts');

  const uu = new UniqueUrl({ url: 'http://test.com' });
  await ast.push(uu);

  t.assert(await ast.db.exists());
});


test("edges", async (t) => {
  const ast = await ArangoStore.open('spidergram_inserts');

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
  const results = await ast.add([uu, re, rw, lt]);
  t.assert(results.length > 0);
});