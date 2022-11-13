import is from '@sindresorhus/is';
import {
  Resource,
  HtmlTools,
  TextTools,
  VerticeWorker,
  WorkerStatus
} from '../../index.js';
import { CLI, SpidergramCommand } from '../index.js';

export default class Analyze extends SpidergramCommand {
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

    const worker = new VerticeWorker<Resource>({
      collection: 'resources',
      task: async (resource) => {
        if (is.nonEmptyStringAndNotWhitespace(resource.body)) {
          if (flags.metadata) {
            resource.meta = HtmlTools.getMetadata(resource.body);
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

    this.ux.info('Analyzing saved pages...');
    const progress = new CLI.progress.Bar({hideCursor: true}, CLI.progress.Presets.shades_grey);

    // If we're in 'verbose' mode, we'll be logging to screen rather than summarizing status.
    if (flags.verbose) {
      worker.on('progress', () => {
        this.ux.info(`Processed ${worker.status.processed} of ${worker.status.total}...`);
      });
    } else {
      worker.on('progress', () => {
        progress.setTotal(worker.status.total);
        progress.increment();
      });
      progress.start(worker.status.total, 0);
    }
    
    await worker.run();
    
    if (!flags.verbose) progress.stop();
    this.summarizeResults(worker.status);
  }

  summarizeResults(stats: WorkerStatus) {
    this.log();
    this.ux.styledJSON(stats);
    this.ux.styledHeader('Analysis complete.');
  }
}
