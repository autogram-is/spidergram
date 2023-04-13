import {
  Spidergram,
  Resource,
  WorkerQuery,
  OutputLevel,
  GraphTools,
} from '../../index.js';
import { CLI, SgCommand } from '../index.js';
import { buildFilter } from '../shared/flag-query-tools.js';
import { queryFilterFlag } from '../shared/flags.js';
import { Flags } from '@oclif/core';

export default class Analyze extends SgCommand {
  static summary = 'Analyze the content of all crawled pages';

  static flags = {
    ...CLI.analysisFlags,
    filter: queryFilterFlag,
    concurrency: Flags.integer({
      summary: 'Analyze multiple pages simultaneously',
      default: 1,
    }),
    limit: Flags.integer({
      char: 'l',
      summary: 'The maximum number of results to process',
    }),
    verbose: CLI.outputFlags.verbose,
  };

  static strict = false;

  async run() {
    const { flags } = await this.parse(Analyze);
    const sg = await Spidergram.load();

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    const options: GraphTools.PageAnalysisOptions = {};

    // True-by-default options
    if (flags.metadata === false) {
      options.data = false;
    }
    if (flags.tech === false) {
      options.tech = false;
    }
    if (flags.content === false) {
      options.content = false;
    }

    // False-by-default options
    if (!flags.links) {
      options.links = false;
    }
    if (!flags.properties) {
      options.properties = false;
    }
    if (!flags.designPatterns) {
      options.patterns = false;
    }
    if (!flags.site) {
      options.site = false;
    }

    const worker = new WorkerQuery<Resource>('resources', {
      concurrency: flags.concurrency,
    });
    for (const f of flags.filter ?? []) {
      worker.filterBy(buildFilter(f));
    }
    if (!flags.reprocess) {
      worker.filterBy({ path: '_analyzed', eq: null });
    }
    if (flags.limit) worker.limit(flags.limit);

    this.startProgress('Analyzing saved pages...');

    worker.on('progress', status => this.updateProgress(status));
    worker.on('end', status => {
      this.stopProgress();
      this.log(sg.cli.summarizeStatus(status));
    });

    await worker.run(async resource => {
      return GraphTools.analyzePage(resource, options)
        .then(resource => sg.arango.push(resource))
        .then(() => resource.url);
    });
  }
}
