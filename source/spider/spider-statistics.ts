import { FinalStatistics } from "crawlee";

export interface SpiderStatistics extends FinalStatistics, SpiderInternalStatistics {};

export interface SpiderInternalStatistics {
  /**
   * The approximate number of requests added to the crawl queue,
   * whether complete or pending.
   *
   * @type {number}
   */
  requestsEnqueued: number,

  /**
   * The approximate number of completed requests.
   *
   * @type {number}
   */
  requestsCompleted: number,

  /**
   * The number of finished requests, grouped by HTTP status code.
   */
  requestsByStatus: Record<number, number>,

  /**
   * The number of finished requests, grouped by the Response's content-type header.
   */
  requestsByType: Record<string, number>,

  /**
   * The number of finished requests, grouped by the Request's hostname.
   */
  requestsByHost: Record<string, number>,

  /**
   * The number of finished requests, grouped by the Response's label.
   */
  requestsByLabel: Record<string, number>
}