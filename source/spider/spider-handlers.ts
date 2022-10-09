import { CrawlingContext } from "crawlee";
import { SpiderContext } from "./context.js";
import { SpiderHelper } from "./spider-helper.js";

export abstract class SpiderHandlers {
  abstract helpers: SpiderHelper

  /**
   * @param context A crawler-specific context object; be sure to to specify the correct interface in implementing functions.
   * @param spidergram Spidergram-specific context object, containing crawl rules and other state.
   */
  abstract requestHandler(
    context: CrawlingContext,
    spidergram: SpiderContext
  ): Promise<void>

  /**
   * @param context A crawler-specific context object; be sure to to specify the correct interface in implementing functions.
   * @param error The last error thrown during crawl processing.
   * @param spidergram Spidergram-specific context object, containing crawl rules and other state.
   */
  abstract failureHandler(
    context: CrawlingContext,
    error: Error,
    spidergram: SpiderContext
  ): Promise<void>
}