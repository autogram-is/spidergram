import {CombinedContext} from '../context.js';

export type SpiderHook = (context: CombinedContext, ...args: any[]) => Promise<void>;
