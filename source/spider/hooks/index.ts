import {CombinedContext} from '../context.js';

export * from './request-router.js';
export * from './context-builder.js';

export type SpiderHook = (context: CombinedContext, ...args: any[]) => Promise<void>;
