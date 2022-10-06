import { Arango } from "../arango.js";

export interface SpidergramCrawlingContext extends Record<string, unknown> {
  storage: Arango,
}
