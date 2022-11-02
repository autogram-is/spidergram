import {SpiderContext} from '../context.js';
import {PlaywrightGotoOptions} from 'crawlee';

export * from './request-router.js';
export * from './context-builder.js';

export interface SpiderHook {
  (context: SpiderContext, options?: PlaywrightGotoOptions): Promise<void>
}