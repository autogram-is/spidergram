import {google, analyticsreporting_v4} from 'googleapis';
import {SimpleAuth} from '../../source/integration/google/index.js';

google.options({
  auth: await SimpleAuth.authenticate([
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics'
  ])
});
const analytics = new analyticsreporting_v4.Analyticsreporting(google);
const request: analyticsreporting_v4.Schema$ReportRequest = {
  viewId: '148984872',
  dateRanges: [{ startDate: '7daysAgo', endDate: 'today'}],
  metrics: [{ expression: 'ga:sessions' }],
}

// See https://developers.google.com/analytics/devguides/reporting/core/v4
// and https://ga-dev-tools.web.app/request-composer/metric-expression/

const results = await analytics.reports.batchGet({
  requestBody: { reportRequests: [request] },
});

console.log(results);