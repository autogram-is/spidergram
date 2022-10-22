import { SupportedCrawlingContext, SpiderContext } from "../context.js";

export function wrapHook<C extends SupportedCrawlingContext>(hook: Function) {
  return (ctx: C, ...options: any[]) => hook(ctx as SpiderContext & C, options);
}

export function wrapHandler<C extends SupportedCrawlingContext>(handler: Function) {
  return (ctx: C, ...options: any[]) => handler(ctx as SpiderContext & C, options);
}
