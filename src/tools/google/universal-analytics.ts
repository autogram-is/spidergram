import { google, analyticsreporting_v4 } from 'googleapis';
import { authenticate } from './jwt-auth.js';
import { NormalizedUrl } from '@autogram/url-tools';
import _ from 'lodash';
import is from '@sindresorhus/is';
import { DateTime, Duration } from 'luxon';
import { JsonPrimitive } from '@salesforce/ts-types';
import prependHttp from 'prepend-http';

// Note that Google Universal Analytics properties will be sunsetted in July 2023;
// We'll be adding a GA4 implementation of these helper functions for those that
// have already migrated.
//
// See https://developers.google.com/analytics/devguides/reporting/core/v4/basics

export type UaRequest = analyticsreporting_v4.Schema$ReportRequest;
export type UaResponse = analyticsreporting_v4.Schema$GetReportsResponse;
export type UaReport = analyticsreporting_v4.Schema$Report;
export type UaReportRow = analyticsreporting_v4.Schema$ReportRow;

type DateWindow = 'day' | 'week' | 'month' | 'year';

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
  pageSize: number;

  /**
   * An object with startDate and endDate strings, in 'YYYY-MM-DD' format
   * or '000daysago' format. If this property is populated, dateWindow and
   * dateOffset will be ignored.
   *
   * @see {@link buildDateRange}
   *
   * @type {startDate: string, endDate: string}
   */
  dateRange?: { startDate: string; endDate: string };

  /**
   * The unit of time covered by the report. Ignored if dateRange is populated.
   *
   * @see {@link buildDateRange}
   *
   * @defaultValue {'month'}
   * @type {DateWindow}
   */
  dateWindow?: DateWindow;

  /**
   * Used in conjunction with `dateWindow` to calculate the report's start
   * and end date. Ignored if dateRange is populated.
   *
   * @see {@link buildDateRange}
   *
   * @defaultValue {-1}
   * @type {number}
   */
  dateOffset?: number;

  /**
   * The dimension used to subdivide traffic data.
   *
   * 'page': Stats for individual URLs
   * 'host': Aggregate stats for each hostname
   * 'none': Sum of all stats; will return one row only.
   *
   * @defaultValue {'page'}
   * @type {string}
   */
  dimension: 'page' | 'host' | 'none';

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
  metrics: string[] | Record<string, string>;

  /**
   * The metric used to sort the returned results.
   *
   * NOTE: Results are always sorted in descending order.
   *
   * @defaultValue {'ga:uniquePageViews'}
   * @type {string}
   */
  order: string;

  /**
   * If set, only data for URLs at the specified hostname will be returned.
   *
   * @type {?string}
   */
  hostname?: string;

  /**
   * A specific user agent whose traffic should be ignored; by default, Spidergram
   * ignores its own traffic.
   *
   * @defaultValue {'spidergram'}
   * @type {?string}
   */
  spiderUserAgent?: string;

  /**
   * Ignore results with no uniquePageVisits.
   *
   * @defaultValue {true}
   * @type {boolean}
   */
  ignoreUnvisited: boolean;
}

const defaultRequestOptions: UaRequestOptions = {
  pageSize: 100_000,
  dateOffset: -1,
  dateWindow: 'year',
  order: 'ga:uniquePageViews',
  dimension: 'page',
  metrics: {
    users: 'ga:users',
    uniqueViews: 'ga:uniquePageViews',
    totalTime: 'ga:timeOnPage',
    entrances: 'ga:entrances',
    bounces: 'ga:bounces',
    exits: 'ga:exits',
  },
  spiderUserAgent: 'spidergram',
  ignoreUnvisited: true,
};

export async function fetchUaReport(
  request: UaRequest,
  pageToken?: string,
): Promise<UaResponse> {
  await authenticate('https://www.googleapis.com/auth/analytics.readonly');
  const ua = google.analyticsreporting('v4');
  return ua.reports
    .batchGet({
      requestBody: { reportRequests: [{ ...request, pageToken: pageToken }] },
    })
    .then(value => value.data);
}

export function buildUaRequest(
  viewId: string,
  customOptions: Partial<UaRequestOptions> = {},
) {
  const options: UaRequestOptions = _.defaultsDeep(
    customOptions,
    defaultRequestOptions,
  );
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
      request.dimensions = [{ name: 'ga:pagePath' }];
      break;
    case 'host':
      request.dimensions = [{ name: 'ga:hostname' }];
      break;
    default:
      break;
  }

  // Use our helper function to generate a windowed date range of 1 day, week, month, or year
  request.dateRanges = options.dateRange
    ? [options.dateRange]
    : [buildDateRange(options.dateWindow, options.dateOffset)];

  // Generate metrics
  request.metrics = buildMetrics(options.metrics);

  // Generate filters
  if (options.spiderUserAgent) {
    request.dimensionFilterClauses?.[0].filters?.push({
      dimensionName: 'ga:browser',
      not: true,
      operator: 'PARTIAL',
      expressions: [options['spiderUserAgent']],
    });
  }
  if (options.hostname) {
    request.dimensionFilterClauses?.[0].filters?.push({
      dimensionName: 'ga:hostname',
      operator: 'BEGINS_WITH',
      expressions: [options['hostname']],
    });
  }
  if (options.ignoreUnvisited) {
    request.metricFilterClauses?.[0].filters?.push({
      metricName: 'ga:uniquePageViews',
      operator: 'GREATER_THAN',
      comparisonValue: '0',
    });
  }

  return request;
}

/**
 * Given a unit of time and an offset, generates start and end ISO dates.
 *
 * A dateOffset of -1 will generate a range starting one dateWindow ago, and
 * ending yesterday. (e.g., on November 10th a window of 'month' and an
 * offset of '-1' would generate a report for Oct9-Nov9.)
 *
 * A dateOffset of 0 will generate a range covering the most recent complete
 * dateWindow. (e.g., on November 10th a window of 'month' and and
 * offset of '0' would generate a report for Oct1-Oct31.)
 *
 * Incrementing the dateOffset (1, 2, 3, etc) moves back in time by the
 * specified dateWindow, much like the 'page' of a paged result set.
 *
 * @export
 * @param window The span of time the range should cover.
 * @param offset The span's offset from the current day.
 * @param today Optional override for the 'current day'; primarily intended for testing.
 */
export function buildDateRange(
  window: DateWindow = 'month',
  offset = -1,
  today = DateTime.local(),
): { startDate: string; endDate: string } {
  // Prep the starting points
  let start = today.minus({ days: 1 }) as DateTime<true> | DateTime<false>;
  let end = today.minus({ days: 1 }) as DateTime<true> | DateTime<false>;

  // If the offset is non-negative, we want to 'snap' to a week, month, or year boundary.
  if (offset >= 0) {
    switch (window) {
      case 'day':
        start = start.minus({ day: offset });
        end = start;
        break;

      case 'week':
        start = DateTime.fromObject({
          weekYear: start.year,
          weekNumber: start.weekNumber,
        })
          .minus({ week: offset + 1 })
          .startOf('week');
        end = start.endOf('week');
        break;

      case 'month':
        start = DateTime.fromObject({ year: start.year, month: start.month })
          .minus({ month: offset + 1 })
          .startOf('month');
        end = start.endOf('month');
        break;

      case 'year':
        start = DateTime.fromObject({ year: start.year })
          .minus({ year: offset + 1 })
          .startOf('year');
        end = start.endOf('year');
        break;
    }
  } else {
    // 'end' will always be yesterday; it's a rolling window.
    switch (window) {
      case 'week':
        start = end.minus({ week: 1, day: -1 });
        break;

      case 'month':
        start = end.minus({ month: 1, day: -1 });
        break;

      case 'year':
        start = end.minus({ year: 1, day: -1 });
        break;
    }
  }

  return {
    startDate: start.toISODate() ?? '',
    endDate: end.toISODate() ?? '',
  };
}

function buildMetrics(input: string[] | Record<string, string>) {
  if (Array.isArray(input)) {
    return input.map(value => {
      return { expression: value };
    });
  } else {
    return _.keys(input).map(value => {
      return { expression: input[value], alias: value };
    });
  }
}

// Simplifies a Universal Analytics Report's structure by merging its dimensions and metric
// columns; additional data can be passed in by the caller (for example, key IDs for other records
// or date-spans)
export function flattenReport(
  report: UaReport,
  defaults: Record<string, JsonPrimitive> = {},
) {
  const types = [
    ...(report.columnHeader?.dimensions ?? []).map(
      () => 'METRIC_TYPE_UNSPECIFIED',
    ),
    ...(report.columnHeader?.metricHeader?.metricHeaderEntries?.map(
      header => header.type ?? 'METRIC_TYPE_UNSPECIFIED',
    ) ?? []),
  ];
  const headers = [
    ...(report.columnHeader?.dimensions ?? []),
    ...(report.columnHeader?.metricHeader?.metricHeaderEntries?.map(
      header => header.name ?? '',
    ) ?? []),
  ].map(value => value.replace('ga:', ''));

  const results: Record<string, JsonPrimitive>[] = [];
  for (const row of report.data?.rows ?? []) {
    const values = [
      ...(row.dimensions ?? []),
      ...(row.metrics?.pop()?.values ?? []),
    ];
    const result: Record<string, JsonPrimitive> = { ...defaults };
    headers.forEach((header, i) => {
      result[header] = parseGaValue(values[i], types[i]);
    });
    results.push(result);
  }
  return results;
}

// This helper function only works if the values for the URL are summable numbers;
// any precomputed averages will result in borked values.
export function sumReportByUrl(
  report: Record<string, JsonPrimitive>[],
  normalizer = NormalizedUrl.normalizer,
  key = 'pagePath',
) {
  const newReport: Record<string, Record<string, JsonPrimitive>> = {};
  for (const r of report) {
    try {
      const url = new NormalizedUrl(
        prependHttp(r[key] as string),
        undefined,
        normalizer,
      ).href;
      r[key] = url;
      if (newReport[url] === undefined) {
        newReport[url] = r;
      } else {
        for (const k in _.keys(r)) {
          if (is.number(r[k]) && is.number(newReport[url][k])) {
            newReport[url][k] =
              (newReport[url][k] as number) + (r[k] as number);
          }
        }
      }
    } catch (e: unknown) {
      if (is.error(e)) throw e;
      else throw new Error('Unparsable URL encountered', { cause: r[key] });
    }
  }
  return _.values(newReport);
}

// According to Google's API documentation, 'TIME' should arrive in 'HH:MM:SS' format;
// instead, the data arrives in raw seconds. Keep an eye on that.
// https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet#MetricType
function parseGaValue(value: string, type: string): JsonPrimitive {
  switch (type) {
    case 'INTEGER':
    case 'TIME':
      if (value.includes(':')) {
        const segments = value.split(':');
        return Duration.fromObject({
          hours: Number.parseInt(segments[0]),
          minutes: Number.parseInt(segments[1]),
          seconds: Number.parseInt(segments[0]),
        }).seconds;
      }
      return Number.parseInt(value);
    case 'PERCENT':
    case 'CURRENCY':
      return Number.parseFloat(value);
    default:
      return value;
  }
}
