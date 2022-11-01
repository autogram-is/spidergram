import {CombinedSpiderContext} from '../context.js';
export * from './default-handler.js';
export * from './status-handler.js';
export * from './download-handler.js';
export * from './failure-handler.js';
export * from './sitemap-handler.js';
export * from '../hooks/context-builder.js';

export interface SpiderRequestHandler {
  (context: CombinedSpiderContext): Promise<void>
}