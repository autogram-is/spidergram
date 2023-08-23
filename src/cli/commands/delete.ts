import { CLI, SgCommand } from '../index.js';
import { Flags } from '@oclif/core';
import { buildFilter } from '../shared/flag-query-tools.js';
import { queryFilterFlag } from '../shared/index.js';

import { Query, Spidergram } from '../../index.js';

export default class DeleteEntities extends SgCommand {
  static description = 'Delete entries from the crawl database';

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
    const sg = await Spidergram.load();

    const docCollections = ['unique_urls', 'resources', 'sites', 'patterns'];
    const relCollections = ['appears_on', 'links_to', 'is_child_of', 'is_variant_of', 'responds_with'];

    // If a collection was passed in, start building a query.
    // If 'orphans' was specified, start calculating the number of 
  
    if (flags.collection) {
      if (!docCollections.includes(flags.collection)) {
        this.error(`No collection named '${flags.collection}'.`);
      }

      const q = new Query(flags.collection);
      if (flags.filter) {
        for (const f of flags.filter ?? []) {
          q.filterBy(buildFilter(f));
        }
      }

      const cq = new Query(q.spec);
      cq.return('_id')
      const delCount = (await cq.run()).length;

      if (delCount === 0) {
        this.error('No matching documents.');
      }

      const confirmation = flags.force ? true : await CLI.confirm(`Delete ${delCount} matching ${flags.collection} documents?`);
      if (!confirmation) {
        this.ux.info(`Delete canceled; no documents were affected.`);
        this.exit(0);
      }

      if (flags.orphans) {
        const confirmation = flags.force ? true : await CLI.confirm(`Delete all relationships connected to the affected documents?`);
        if (!confirmation) {
          this.ux.info(`Delete canceled; no documents or relationships were affected.`);
          this.exit(0);
        }
  
        this.ux.action.start('Deleting');
        
        q.spec.return = undefined;
        q.spec.remove = undefined;
        q.return('_id');
        const ids = await q.run<string>();

        const queries: Query[] = [];

        for (const rel of relCollections) {
          queries.push(new Query(rel).filterBy('_from', ids).remove());
          queries.push(new Query(rel).filterBy('_to', ids).remove());
        }

        // Special case handling for body HTML storage; we need to clean this up later.
        if (q.spec.collection === 'resources' && sg.config.offloadBodyHtml === 'db') {
          queries.push(new Query('kv_body_html').filterBy('_key', ids).remove());
        }

        for (const qs of queries) {
          this.ux.action.status = qs.spec.collection.toString();
          await qs.run();
        }

        this.ux.action.stop();
      }
      
      q.spec.remove = undefined;
      q.spec.return = undefined;
      q.remove();
      this.ux.action.status = q.spec.collection.toString();
      await q.run();
    }
  }
}
