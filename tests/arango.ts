import test from "ava";
import { SpiderGraph } from "../source/spider-graph.js";

test("spidergraph connection", async (t) => {
  const g = new SpiderGraph('spidergram');
  t.assert(await g.db.exists());
});
