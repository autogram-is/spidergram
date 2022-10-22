import {SpiderContext, SupportedContext} from '../context.js';

export * from './request-router.js';
export * from './context-builder.js';

export type SpiderHook<Context extends SupportedContext = SupportedContext> = (context: Context & SpiderContext, ...args: any[]) => Promise<void>;
