import {PlaywrightGotoOptions} from 'crawlee';
import {SpiderContext} from '../context.js';

export * from './request-router.js';
export * from './context-builder.js';

export type SpiderHook = (context: SpiderContext, options?: PlaywrightGotoOptions) => Promise<void>;
