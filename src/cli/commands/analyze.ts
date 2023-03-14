import {
  Spidergram,
  Resource,
  WorkerQuery,
  OutputLevel,
  analyzePage,
  PageAnalysisOptions,
} from '../../index.js';
import { CLI, SgCommand } from '../index.js';

export default class Analyze extends SgCommand {
  static summary = 'Analyze the content of all crawled pages';

  static flags = {
    config: CLI.globalFlags.config,
    options: CLI.globalFlags.options,
    ...CLI.analysisFlags,
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
    if (flags.metadata === false) {
      options.data = false;
    }
    if (flags.content === false) {
      options.content = false;
    }
    if (flags.tech === false) {
      options.tech = false;
    }

    this.startProgress('Analyzing saved pages...');

    const worker = new WorkerQuery<Resource>('resources')
      .filterBy('code', 200)
      .filterBy('mime', 'text/html');

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
