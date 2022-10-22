import { CombinedSpiderContext } from '../context.js';

export interface SpiderHook {
  (context: CombinedSpiderContext, ...args: any[]): Promise<void>
}