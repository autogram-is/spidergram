import {
  Spidergram,
  Resource,
  HtmlTools,
  WorkerQuery,
  OutputLevel,
  BrowserTools,
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

    const worker = new WorkerQuery<Resource>('resources')
      .filterBy('code', 200)
      .filterBy('mime', 'text/html');

    worker.on('progress', status => this.updateProgress(status));
    this.startProgress('Analyzing saved pages...');

    sg.config.pageContent ??= {};
    if (flags.body) {
      sg.config.pageContent ??= {};
      sg.config.pageContent.selector = flags.body;
      sg.config.pageContent.readability = flags.readability;
    }

    await worker
      .run(async resource => {
        resource.data = await HtmlTools.getPageData(resource);
        if (flags.content) {
          resource.content = await HtmlTools.getPageContent(resource);
        }
        if (flags.tech) {
          resource.tech = await BrowserTools.getPageTechnologies(resource).then(
            techs => techs.map(tech => tech.name),
          );
        }
        await sg.arango.push(resource);
      });

    this.stopProgress();
    this.log(sg.cli.summarizeStatus(worker.status));
  }
}
