import {CombinedSpiderContext} from '../context.js';
import {PlaywrightGotoOptions} from 'crawlee';

export * from './request-router.js';
export * from './context-builder.js';

export interface SpiderHook {
  (context: CombinedSpiderContext, options?: PlaywrightGotoOptions): Promise<void>
}