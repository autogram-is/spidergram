import { PlaywrightGotoOptions } from 'crawlee';
import { SpiderContext } from '../context.js';

export type SpiderHook = (
  context: SpiderContext,
  options?: PlaywrightGotoOptions,
) => Promise<void>;
