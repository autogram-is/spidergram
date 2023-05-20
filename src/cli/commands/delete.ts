import { SgCommand } from '../index.js';
import { Flags, ux } from '@oclif/core';
import { buildFilter } from '../shared/flag-query-tools.js';
import { queryFilterFlag } from '../shared/index.js';

import { Spidergram } from '../../index.js';
import { SpiderCli } from '../shared/spider-cli.js';

export default class DeleteEntities extends SgCommand {
  static description = 'Remove entries from the crawl database';

  static flags = {
    collection: Flags.string({
      char: 'c',
      summary: 'The collection whose items should be deleted',
    }),
    filter: {
      ...queryFilterFlag,
      summary: 'Filter criteria for documents to delete',
    },
    orphans: Flags.boolean({
      char: 'o',
      summary: 'Delete orphaned relationships',
    }),
    limit: Flags.integer({
      char: 'l',
      summary: 'Maximum number of documents to delete',
    }),
    force: Flags.boolean({
      char: 'y',
      summary: 'Skip confirmation prompt',
    }),
  };

  async run() {
    const { flags } = await this.parse(DeleteEntities);
    const cli = new SpiderCli();
    const sg = await Spidergram.load();

    
  }

}
