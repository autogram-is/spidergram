import {CombinedContext} from '../context.js';

export type SpiderRequestHandler = (context: CombinedContext, ...args: any[]) => Promise<void>;
