import is from '@sindresorhus/is';
import {
  Resource,
  HtmlTools,
  TextTools,
  GraphWorker,
  OutputLevel
} from '../../index.js';
import { CLI, SgCommand } from '../index.js';

export default class Analyze extends SgCommand {
  static summary = "Analyze the content of all crawled pages";

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

    const worker = new GraphWorker<Resource>({
      collection: 'resources',
      task: async (resource) => {
        if (is.nonEmptyStringAndNotWhitespace(resource.body)) {
          if (flags.metadata) {
            const data: Record<string, unknown> = {
              ...await HtmlTools.getMetadata(resource),
              bodyAttributes: HtmlTools.getBodyAttributes(resource.body)
            };
            resource.data = data;
          }

          let text = '';
          if (flags.text || flags.readability) {
            text = HtmlTools.getPlainText(resource.body, {
              baseElements: {selectors: flags.body}
            });
          }

          if (text.length > 0) {
            const content: Record<string, unknown> = {};
            if (flags.text) { 
              content.text = text;
            }
            if (flags.readability) {
              content.readability = TextTools.calculateReadability(text);
            }
            if (!is.emptyObject(content)) {
              resource.content = content;
            }
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
