import { CombinedContext } from '../context.js';

export interface SpiderHook {
  (context: CombinedContext, ...args: any[]): Promise<void>
}