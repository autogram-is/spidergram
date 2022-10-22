import { CombinedSpiderContext } from "../context.js";

export interface SpiderRequestHandler {
  (context: CombinedSpiderContext, ...args: any[]): Promise<void>;
}