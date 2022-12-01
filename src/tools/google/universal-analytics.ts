import { google, analyticsreporting_v4 } from 'googleapis'
import { authenticate } from './jwt-auth.js';
import _ from 'lodash';

export const UniversalAnalytics = google.analyticsreporting('v4');
export type UaRequest = analyticsreporting_v4.Schema$ReportRequest;
export type UaReport = analyticsreporting_v4.Schema$Report;

/**
 * Simplified reporting options for Google Universal Analytics.
 * 
 * By default, Spidergram's Universal Analytics helper generates reports
 * on a per-URL basis, and pulls raw value metrics rather than pre-calculated
 * aggregates (e.e., 'total time on page' and 'total visits' rather than 'average
 * time on page'). This allows us to summarize and aggregate on axis that were
 * never exposed to Google Analytics.
 * 
 * More traditional GA reports are still possible, but it may be easier to
 * bypass Spidergram's helper and use Google's API directly.
 *
 * @export
 * @interface UaRequestOptions
 * @typedef {UaRequestOptions}
 */
export interface UaRequestOptions {
  /**
   * The number of rows to return in a single request.
   *
   * @defaultValue {100_000}
   * @type {number}
   */
  pageSize: number,


  /**
   * The time span the report will cover.
   *
   * @defaultValue {'year'}
   * @type {('day' | 'week' | 'month' | 'year')}
   */
  dateWindow: 'day' | 'week' | 'month' | 'year',

  /**
   * Used in conjunction with `dateWindow` to calculate the report's start
   * and end date.
   * 
   * A dateOffset of -1 will generate a range starting one dateWindow ago, and
   * ending yesterday. (e.g., on November 10th a window of 'month' and and
   * offset of '-1' would generate a report for Oct9-Nov9.)
   * 
   * A dateOffset of 0 will generate a range covering the most recent complete
   * dateWindow. (e.g., on November 10th a window of 'month' and and
   * offset of '0' would generate a report for Oct1-Oct31.)
   * 
   * Incrementing the dateOffset (1, 2, 3, etc) moves back in time by the
   * specified dateWindow, much like the 'page' of a paged result set.
   *
   * @defaultValue {-1}
   * @type {number}
   */
  dateOffset: number
  
  /**
   * The dimension used to subdivide site traffic data.
   * 
   * 'page': Stats for individual URLs
   * 'host': Aggregate stats for each hostname
   * 'none': Sum of all stats; will return one row only.
   *
   * @defaultValue {'page'}
   * @type {string}
   */
  dimension: 'page' | 'host' | 'none',
  
  /**
   * A list of GA metric expressions, or a dictionary whose keys contain
   * metric aliases and values contain GA metric expressions. If no metrics
   * are specified, Spidergram retrieves uniquePageViews, users, timeOnPage,
   * entrances, bounces, and exits.
   * 
   * @example
   * ```
   * let metrics = [
   *   'ga:uniquePageViews',
   *   'ga:timeOnPage',
   * ];
   * 
   * metrics = {
   *   users: 'ga:uniquePageViews',
   *   totalTime: 'ga:timeOnPage',
   * }
   * ```
   *
   * @type {(string[] | Record<string, string>)}
   */
  metrics: string[] | Record<string, string>,
  
  /**
   * The metric used to sort the returned results.
   * 
   * NOTE: Results are always sorted in descending order.
   *
   * @defaultValue {'ga:uniquePageViews'}
   * @type {string}
   */
  order: string,
  
  /**
   * If specificied, only data for URLs at the specified hostname will be returned. 
   *
   * @type {?string}
   */
  hostname?: string,
  
  /**
   * A specific user agent whose traffic should be ignored; by default, Spidergram
   * ignores its own traffic.
   *
   * @defaultValue {'spidergram'}
   * @type {?string}
   */
  spiderUserAgent?: string,
  
  /**
   * Ignore results with no uniquePageVisits.
   *
   * @defaultValue {true}
   * @type {boolean}
   */
  ignoreUnvisited: boolean,
}

const defaultOptions: UaRequestOptions = {
  pageSize: 100_000,
  dateOffset: -1,
  dateWindow: 'year',
  order: 'ga:uniquePageViews',
  dimension: 'page',
  metrics: {
    users: 'ga:uniquePageViews',
    visits: 'ga:users',
    totalTime: 'ga:timeOnPage',
    entrances: 'ga:entrances',
    bounces: 'ga:bounces',
    exits: 'ga:exits'
  },
  spiderUserAgent: 'spidergram',
  ignoreUnvisited: true
};

// Due to the approach we're taking, this helper function assumes a single
// report rather than a batched one.
export async function fetchUaReport(request: UaRequest) {
  await authenticate('https://www.googleapis.com/auth/analytics.readonly');
  return UniversalAnalytics.reports.batchGet({ requestBody: { reportRequests: [ request ] } })
    .then(value => value.data.reports?.pop() ?? {});
}

export function buildUaRequest(viewId: string, customOptions: Partial<UaRequestOptions> = {}) {
  const options: UaRequestOptions = _.defaultsDeep(customOptions, defaultOptions);
  const request: UaRequest = { 
    viewId: viewId,
    pageSize: options.pageSize,
    dateRanges: [],
    orderBys: [{ fieldName: options.order, sortOrder: 'DESCENDING' }],
    dimensions: [],
    metrics: [],
    metricFilterClauses: [{ filters: [], operator: 'AND' }],
    dimensionFilterClauses: [{ filters: [], operator: 'AND' }],
    hideTotals: true,
    hideValueRanges: true,
  };

  // Generate dimension
  switch (options.dimension) {
    case 'page':
      request.dimensions = [{ name: 'ga:pagePath' }]
      break;
    case 'host':
      request.dimensions = [{ name: 'ga:hostname' }]
      break;
    default:
      break;
  }
  
  // TODO: generate date range
  request.dateRanges = [ { startDate: '365daysAgo', endDate: 'yesterday' } ];

  // Generate metrics
  request.metrics = buildMetrics(options.metrics);

  // Generate filters
  if (options.spiderUserAgent) {
    request.dimensionFilterClauses![0].filters!.push({
      dimensionName: 'ga:browser', not: true, operator: 'PARTIAL', expressions: [options['spiderUserAgent']]
    });
  }
  if (options.hostname) {
    request.dimensionFilterClauses![0].filters!.push({
      dimensionName: 'ga:hostname', operator: 'STARTSWITH', expressions: [ options['hostname'] ]
    });
  }
  if (options.ignoreUnvisited) {
    request.metricFilterClauses![0].filters!.push({
      metricName: 'ga:uniquePageViews', operator: 'GREATER_THAN', comparisonValue: '0'
    });
  }

  return request;
}

function buildMetrics(input: string[] | Record<string, string>) {
  if (Array.isArray(input)) {
    return input.map(value => {
      return { expression: value }
    });
  } else {
    return Object.keys(input).map(value => {
      return { expression: input[value], alias: value }
    });
  }
}