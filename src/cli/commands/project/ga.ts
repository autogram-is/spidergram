import { SpidergramCommand, CLI } from '../../index.js';
import { GoogleTools } from '../../../index.js';
import { Flags } from '@oclif/core';

export default class GA extends SpidergramCommand {
  static description = "Test Google analytics credentials";

  static flags = {
    config: CLI.globalFlags.config,
    view: Flags.string({
      summary: 'Universal Analytics View ID',
      required: true
    }),
  }

  async run() {
    const {flags} = await this.parse(GA);

    // Obtain user credentials to use for the request
    await GoogleTools.authenticate();

    const res = await GoogleTools.analyticsReporting.reports.batchGet({
      requestBody: {
        reportRequests: [{
          viewId: flags.view,
          dateRanges: [ { startDate: '14daysAgo', endDate: '7daysAgo' } ],
          metrics: [ { expression: 'ga:users', } ],
        }],
      },
    });
    console.log(res.data.reports?.pop()?.data);
  }
}
