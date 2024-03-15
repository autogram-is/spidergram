import { SgCommand } from '../index.js';
import { Flags } from '@oclif/core';
import { extractUrls } from 'crawlee';
import * as fse from "fs-extra";
import { buildFilter } from '../shared/flag-query-tools.js';
import { queryFilterFlag } from '../shared/flags.js';
import { summarizeStatus } from '../shared/summarize-status.js';

import { GoogleTools } from '../../index.js';
// import { PageSpeedTask } from '../../tools/google/pagespeed.js';

export default class Pagespeed extends SgCommand {
  static description = 'Retrieve Google Pagespeed performance data for select URLs';

  static flags = {
    input: Flags.file({
      char: 'i',
      summary: 'A text or CSV file containing URLs',
      exclusive: ['collection', 'filter']
    }),
    collection: Flags.string({
      char: 'c',
      summary: 'A database collection to query for URLs',
      description: 'If no collection or input file is given, the "resources" collection in the Spidergram database will be used as the URL source.'
    }),
    filter: queryFilterFlag,
    limit: Flags.integer({
      char: 'l',
      summary: 'Limit the number of URLs processed'
    }),
    output: Flags.string({
      char: 'o',
      summary: 'Optional output file path',
      description: 'If no output file is specified, data will be saved to the "kv_pagespeed" collection in the Spidergram database.'
    }),
    debug: Flags.boolean({
      summary: 'Preview the pagespeed request rather than sending it',
    }),
  };

  async run() {
    const { flags } = await this.parse(Pagespeed);

    if (flags.input) {
      const string = fse.readFileSync(flags.input).toString();
      const urls = extractUrls({ string });
      this.ux.styledJSON(urls);
      this.ux.info('Not yet implemented');
      this.exit();

    } else {
      const ps = new GoogleTools.PageSpeed(undefined);
      for (const f of flags.filter ?? []) {
        ps.filterBy(buildFilter(f));
      }
      if (flags.limit) {
        ps.limit(flags.limit);
      }

      const results = await ps.run();
      this.ux.info(summarizeStatus(results, false));
    }
  }
}


/**
const customTask: PageSpeedTask = async (resource, status, request, report) => {
  if (report) {
    this.updateProgress(status);
    const data = {
      url: resource.url,
      ...GoogleTools.PageSpeed.formatScores(report)
    };
    return kvs.setValue(resource._key, data).then(() => void 0);
  }
  return Promise.resolve();
};
 */