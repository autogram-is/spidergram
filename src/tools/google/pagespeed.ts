import { google, pagespeedonline_v5 } from 'googleapis';
import _ from 'lodash';
import {
  JobStatus,
  Resource,
  Spidergram,
  WorkerQuery,
  WorkerQueryOptions,
} from '../../index.js';

export type PageSpeedRequest =
  pagespeedonline_v5.Params$Resource$Pagespeedapi$Runpagespeed;

export type PageSpeedReport =
  pagespeedonline_v5.Schema$PagespeedApiPagespeedResponseV5;

const defaults: PageSpeedRequest = {
  prettyPrint: false,
  strategy: 'desktop',
  category: ['accessibility', 'best-practices', 'performance', 'pwa', 'seo'],
};

/**
 * A custom function responsible for formatting a {@link PageSpeedReport}, modifying
 * the passed-in resource and passing
 */
export type PageSpeedTask = (
  resource: Resource,
  status: JobStatus,
  request?: PageSpeedRequest,
  report?: PageSpeedReport,
) => Promise<string | void>;

/**
 * Given a set of filter criteria, retrieves all matching Resources, requests a Google
 * Pagespeed Insights report for each one, and saves a summary of the results to
 * `resource.pagespeed`.
 *
 * @remarks
 * PageSpeed Insights is useful, but also limited to 2.4 requests per second and 25,000
 * requests per day. With a large site it's easy to hit that ceiling, and {@link PageSpeed}
 * populates defaults that attempt to keep you from hitting that ceiling.
 */
export class PageSpeed extends WorkerQuery<Resource> {
  /**
   * Retrieve a Google Pagespeed Insights report for a single URL.
   */
  static async getReport(url: URL | string, input: PageSpeedRequest = {}) {
    const pagespeed = google.pagespeedonline('v5');

    const opt: PageSpeedRequest = _.defaultsDeep(
      { url: url.toString() },
      input,
      defaults,
    );
    return pagespeed.pagespeedapi.runpagespeed(opt).then(response => {
      return response.data;
    });
  }

  /**
   * Returns a bare-bones overview of scores in all the requested categories.
   */
  static formatOverview(report: PageSpeedReport) {
    return {
      overall: report.loadingExperience?.overall_category ?? undefined,
      speedIndex:
        report?.lighthouseResult?.audits?.['speed-index']?.numericValue ??
        undefined,
      accessibility:
        report?.lighthouseResult?.categories?.accessibility?.score ?? undefined,
      bestPractices:
        report?.lighthouseResult?.categories?.['best-practices']?.score ??
        undefined,
      performance:
        report?.lighthouseResult?.categories?.performance?.score ?? undefined,
      pwa: report?.lighthouseResult?.categories?.pwa?.score ?? undefined,
      seo: report?.lighthouseResult?.categories?.seo?.score ?? undefined,
      timestamp: report?.analysisUTCTimestamp
        ? new Date(report?.analysisUTCTimestamp).toISOString()
        : undefined,
    };
  }

  /**
   * Returns a bare-bones overview of scores in all the requested categories.
   */
  static formatDetailed(report: PageSpeedReport) {
    const audits: Record<string, unknown> = {};
    for (const [key, data] of Object.entries(
      report?.lighthouseResult?.audits || {},
    )) {
      if (data.score && data.score < 1) {
        audits[key] = {
          description: data.title,
          score: data.score || undefined,
          detail: data.displayValue || undefined,
          numeric: data.numericValue || undefined,
          unit: data.numericUnit || undefined,
        };
      }
    }

    return {
      overall: report.loadingExperience?.overall_category ?? undefined,
      speedIndex:
        report?.lighthouseResult?.audits?.['speed-index']?.numericValue ??
        undefined,
      accessibility:
        report?.lighthouseResult?.categories?.accessibility?.score ?? undefined,
      bestPractices:
        report?.lighthouseResult?.categories?.['best-practices']?.score ??
        undefined,
      performance:
        report?.lighthouseResult?.categories?.performance?.score ?? undefined,
      pwa: report?.lighthouseResult?.categories?.pwa?.score ?? undefined,
      seo: report?.lighthouseResult?.categories?.seo?.score ?? undefined,
      audits,
      timestamp: report?.analysisUTCTimestamp
        ? new Date(report?.analysisUTCTimestamp).toISOString()
        : undefined,
    };
  }

  request: PageSpeedRequest;

  constructor(
    request: PageSpeedRequest = {},
    options: WorkerQueryOptions = {},
  ) {
    // Given Google's API limits, set the default to the public API threshold.
    const opt: WorkerQueryOptions = {
      concurrency: 10,
      interval: 2000,
      intervalCap: request.key ? 2 : 1,
      ...options,
    };

    super('resources', opt);

    this.request = _.defaultsDeep(request, defaults);
    this.filterBy('code', 200)
      .filterBy('mime', 'text/html')
      .limit(request.key ? 20_000 : 2000);
  }

  async run(customTask?: PageSpeedTask, force = false): Promise<JobStatus> {
    // If the user passed in
    if (customTask) this.task = customTask;

    if (!force) {
      this.filterBy({ path: 'pagespeed', eq: null });
    }

    // Goddamn this is nasty.
    return super.run((item, status) =>
      this.getReport(item, status, this.request),
    );
  }

  protected async getReport(
    resource: Resource,
    status: JobStatus,
    request: PageSpeedRequest,
  ): Promise<string | void> {
    return PageSpeed.getReport(resource.url, request).then(report =>
      this.task(resource, status, request, report),
    );
  }

  protected task: PageSpeedTask = async (resource, status, request, report) => {
    const sg = await Spidergram.load();
    if (report) {
      resource.pagespeed = PageSpeed.formatDetailed(report);
      await sg.arango.push(resource);
    }
    return Promise.resolve();
  };
}
