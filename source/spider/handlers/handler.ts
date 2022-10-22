import { CombinedContext } from "../context.js";

export interface SpiderRequestHandler {
  (context: CombinedContext, ...args: any[]): Promise<void>;
}