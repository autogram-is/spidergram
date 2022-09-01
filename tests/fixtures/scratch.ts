import { testElement } from "domutils";
import { JsonGraph, UniqueUrlSet, SimpleCrawler, Context } from "../../source/index.js";

const uus = new UniqueUrlSet([
  "https://blakemasters.com"
]);
const graph = new JsonGraph();
const c = new SimpleCrawler();

(async () => {
  await c.crawl(uus)
    .then(entities => {
      console.log(entities);
      graph.set(entities);
    });

  graph.save('/Users/jeff/test.ndjson').then(() => {
    console.log("it works!");
  });
})();

