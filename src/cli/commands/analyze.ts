import is from '@sindresorhus/is';
import {
  Resource,
  HtmlTools,
  TextTools,
  GraphWorker,
  OutputLevel,
  aql
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
    const { graph, errors } = await this.getProjectContext();

    if (errors.length > 0) {
      for (const error of errors) {
        if (is.error(error)) this.ux.error(error);
      }
    }

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    console.log(flags);

    const worker = new GraphWorker<Resource>({
      collection: 'resources',
      filter: aql`FILTER item.code == 200 AND item.mime == 'text/html'`,
      task: async resource => {
        if (is.nonEmptyString(resource.body)) {
          let data: Record<string, unknown> = {};
          if (flags.metadata) {
            data = HtmlTools.getPageData(resource);
          }

          let text: string | undefined = '';
          if (flags.text || flags.readability) {
            text = HtmlTools.getPageText(resource, flags.body);
          }

          if (text) {
            if (flags.text) {
              data.text = text
            }
            if (flags.readability) {
              data.readability = TextTools.calculateReadability(text);
            }
          }

          resource.data = data;

          await graph.push(resource);
        }
      },
    });

    worker.on('progress', status => this.updateProgress(status));
    this.startProgress('Analyzing saved pages...');

    await worker.run();

    this.stopProgress();
    this.summarizeStatus(worker.status);
  }
}
