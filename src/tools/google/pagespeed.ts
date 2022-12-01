import {google, pagespeedonline_v5} from 'googleapis';
import { authenticate } from './jwt-auth.js';

const pagespeed = google.pagespeedonline('v5');

export type PageSpeedRequest = pagespeedonline_v5.Params$Resource$Pagespeedapi$Runpagespeed;
export type PageSpeedReport = pagespeedonline_v5.Schema$PagespeedApiPagespeedResponseV5;

export async function getPageSpeedReport(input: PageSpeedRequest) {
  await authenticate('openid');
  return pagespeed.pagespeedapi.runpagespeed(input);
}
