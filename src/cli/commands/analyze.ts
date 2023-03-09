import is from '@sindresorhus/is';
import { Spidergram, Resource, HtmlTools, WorkerQuery, OutputLevel } from '../../index.js';
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

    console.log(flags);

    const worker = new WorkerQuery<Resource>('resources')
      .filterBy('code', 200)
      .filterBy('mime', 'text/html');

    worker.on('progress', status => this.updateProgress(status));
    this.startProgress('Analyzing saved pages...');

    await worker.run(async resource => {
      if (is.nonEmptyString(resource.body)) {
        if (flags.metadata) {
          const data = await HtmlTools.getPageData(resource.body);
          if (data) resource.data = data;
        }

        if (flags.text) {
          const content = await HtmlTools.getPageContent(resource, {
            selector: flags.body,
            readability: flags.readability,
          });

          resource.content = content;
        }

        await sg.arango.push(resource);
      }
    });

    this.stopProgress();
    sg.cli.summarizeStatus(worker.status);
  }
}
