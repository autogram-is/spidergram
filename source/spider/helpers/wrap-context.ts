import {SupportedContext, SpiderContext} from '../context.js';

export function wrapHook<C extends SupportedContext>(hook: Function) {
  return (ctx: C, ...options: any[]) => hook(ctx as SpiderContext & C, options);
}

export function wrapHandler<C extends SupportedContext>(handler: Function) {
  return (ctx: C, ...options: any[]) => handler(ctx as SpiderContext & C, options);
}
