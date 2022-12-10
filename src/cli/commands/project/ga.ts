import { SgCommand, CLI } from '../../index.js';
import { GoogleTools } from '../../../index.js';
import { Flags } from '@oclif/core';

const ua = GoogleTools.UniversalAnalytics;

export default class GA extends SgCommand {
  static description = "Test Google analytics credentials";

  static flags = {
    config: CLI.globalFlags.config,
    view: Flags.string({
      summary: 'Universal Analytics View ID',
      required: true
    }),
    host: Flags.string({
      summary: 'Limit results to a specific hostname',
      required: false
    }),
  }

  async run() {
    const {flags} = await this.parse(GA);

    // Obtain user credentials to use for the request
    await GoogleTools.ServiceAccount.authenticate();

    const dateRange = ua.buildDateRange('month', 0);
    const request = ua.buildUaRequest(flags.view, {
      dateRange,
      dimension: 'page',
      pageSize: 10,
      hostname: flags.host,
    });

    const results = await ua.fetchUaReport(request);
    const data = ua.flattenReport(results.reports?.pop() ?? {}, dateRange);
    const dataByNormalizedUrl = ua.sumReportByUrl(data);
    
    const headers: Parameters<typeof this.ux.table>[1] = {};
    for (let h of Object.keys(data[0])) {
      headers[h] = { header: h };
    }
    this.ux.table(dataByNormalizedUrl, headers);
  }
}
