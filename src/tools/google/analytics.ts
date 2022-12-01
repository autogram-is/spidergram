import { google, analyticsreporting_v4, analyticsdata_v1beta } from 'googleapis'

export const analyticsReporting4 = google.analyticsreporting('v4');
export const analyticsData = google.analyticsdata('v1beta');

export type AnalyticsReportingRequest = analyticsreporting_v4.Schema$ReportRequest;
export type AnalyticsReportingReport = analyticsreporting_v4.Schema$Report;

export type AnalyticsDataRequest = analyticsdata_v1beta.Schema$RunReportRequest;
export type AnalyticsDataReport = analyticsdata_v1beta.Schema$RunReportResponse;

export const AnalyticsScopes = ['https://www.googleapis.com/auth/analytics.readonly'];
