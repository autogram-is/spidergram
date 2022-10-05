import test from "ava";
import { Arango } from "../source/arango.js";
import { UniqueUrl, Resource, RespondsWith, LinksTo } from "../source/model/index.js";

test("spidergraph connection", async (t) => {
  const g = new Arango('spidergram');
  t.assert(await g.db.exists());
});

test("insert", async (t) => {
  const a = new Arango();
  const uu = new UniqueUrl({ url: 'http://test.com' });
  a.add(uu);
  t.assert(await a.db.exists());
});


test("edges", async (t) => {
  const a = new Arango('spidergram');
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
  const results = await a.add([uu, re, rw, lt]);
  t.assert(results.length > 0);
});