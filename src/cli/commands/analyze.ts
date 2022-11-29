import is from '@sindresorhus/is';
import {
  Resource,
  HtmlTools,
  TextTools,
  VerticeWorker,
  OutputLevel
} from '../../index.js';
import { CLI, SgCommand } from '../index.js';

export default class Analyze extends SgCommand {
  static summary = "Analyze the content of all crawled pages";

  static usage = '<%= config.bin %> <%= command.id %>'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ];

  static flags = {
    config: CLI.globalFlags.config,
    options: CLI.globalFlags.options,
    ...CLI.analysisFlags,
    verbose: CLI.outputFlags.verbose
  }

  static strict = false
  
  async run() {
    const {flags} = await this.parse(Analyze);
    const {graph, errors} = await this.getProjectContext();

    if (errors.length > 0) {
      for (let error of errors) {
        if (is.error(error)) this.ux.error(error);
      }
    }

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    const worker = new VerticeWorker<Resource>({
      collection: 'resources',
      task: async (resource) => {
        if (is.nonEmptyStringAndNotWhitespace(resource.body)) {
          if (flags.metadata) {
            resource.meta = HtmlTools.getMetaTags(resource.body);
          }

          let text = '';
          if (flags.text || flags.readability) {
            text = HtmlTools.getPlainText(resource.body, {
              baseElements: {selectors: flags.body}
            });
          }

          if (flags.text) { 
            resource.text = text;
          }
          if (flags.readability) {
            resource.readability = TextTools.calculateReadability(text);
          }

          await graph.push(resource);
        }
      }
    });

    worker.on('progress', status => this.updateProgress(status) );
    this.startProgress('Analyzing saved pages...');

    await worker.run();

    this.stopProgress();
    this.summarizeStatus(worker.status);
  }
}
