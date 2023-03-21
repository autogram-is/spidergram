import {
  Spidergram,
  Resource,
  WorkerQuery,
  OutputLevel,
  analyzePage,
  PageAnalysisOptions,
} from '../../index.js';
import { CLI, SgCommand } from '../index.js';
import { buildFilter } from '../shared/flag-query-tools.js';
import { queryFilterFlag } from '../shared/flags.js';

export default class Analyze extends SgCommand {
  static summary = 'Analyze the content of all crawled pages';

  static flags = {
    ...CLI.analysisFlags,
    filter: queryFilterFlag,
    verbose: CLI.outputFlags.verbose,
  };

  static strict = false;

  async run() {
    const { flags } = await this.parse(Analyze);
    const sg = await Spidergram.load();

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    const options: PageAnalysisOptions = {};
    options.data = flags.metadata;
    options.content = flags.content;
    options.tech = flags.tech;
    options.links = flags.links;

    this.startProgress('Analyzing saved pages...');

    const worker = new WorkerQuery<Resource>('resources');

    // Filters
    for (const f of flags.filter ?? []) {
      worker.filterBy(buildFilter(f));
    }

    worker.on('progress', status => this.updateProgress(status));
    worker.on('end', status => {
      this.stopProgress();
      this.log(sg.cli.summarizeStatus(status));
    });

    await worker.run(async resource => {
      return analyzePage(resource, options)
        .then(() => sg.arango.push(resource))
        .then(() => resource.url);
    });
  }
}
