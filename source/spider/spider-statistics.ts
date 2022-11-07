import { FinalStatistics } from "crawlee";

export interface SpiderStatistics extends FinalStatistics, SpiderInternalStatistics {};

export interface SpiderInternalStatistics {
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