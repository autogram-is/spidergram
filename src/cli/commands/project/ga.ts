import { SgCommand, CLI } from '../../index.js';
import { GoogleTools } from '../../../index.js';
import { Flags } from '@oclif/core';

export default class GA extends SgCommand {
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

    const request = GoogleTools.buildUaRequest(flags.view, {
      dateWindow: 'month',
      dimension: 'page',
      pageSize: 10,
    });

    const results = await GoogleTools.fetchUaReport(request);

    this.ux.styledObject(results.data?.rows?.map(value => value.metrics));
  }
}
