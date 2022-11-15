import { Flags } from '@oclif/core';
import is from '@sindresorhus/is';
import { LogLevel } from 'crawlee';
import {
  Spider,
  SpiderStatistics,
  EnqueueUrlOptions,
} from '../../index.js';
import { CLI, SpidergramCommand } from '../index.js';

export default class Crawl extends SpidergramCommand {
  static summary = 'Crawl and store a site';

  static usage = '<%= config.bin %> <%= command.id %> <urls>'

  static examples = [
    '<%= config.bin %> <%= command.id %> example.com',
    '<%= config.bin %> <%= command.id %> --selector="section.main" --download="application/pdf" https://example.com',
  ];

  static flags = {
    ...CLI.globalFlags,
    erase: Flags.boolean({
      description: 'Erase database before crawling'
    }),
    ...CLI.crawlFlags,
    selector: Flags.string({
      multiple: true,
      default: ['a'],
      summary: 'CSS selector for links',
    }),
    verbose: CLI.outputFlags.verbose
  }

  static args = [{
    name: 'urls',
    description: 'One or more URLs to crawl',
    required: true
  }];

  static strict = false
  
  async run() {
    const {project, graph, errors} = await this.getProjectContext();
    const {argv: urls, flags} = await this.parse(Crawl);

    if (errors.length > 0) {
      for (let error of errors) {
        if (is.error(error)) this.ux.error(error);
      }
    }

    if (flags.erase) {
      const confirmation = await CLI.confirm(`Erase the ${project.name} database before crawling`);
      if (confirmation) {
        await graph.erase({ eraseAll: true });
      }
    }

    const spider = new Spider({
      logLevel: flags.verbose ? LogLevel.DEBUG : LogLevel.OFF,
      maxConcurrency: flags.concurrency,
      maxRequestsPerMinute: flags.rate,
      downloadMimeTypes: [flags.download ?? ''],
      async pageHandler(context) {
        const {$, saveResource, enqueueUrls} = context;

        await saveResource({ body: $!.html() });
        
        const urlOptions: Partial<EnqueueUrlOptions> = {};
        if (flags.discover !== 'none') {
          urlOptions.save = flags.discover;
          urlOptions.enqueue = (flags.enqueue === 'none') ? () => false : flags.enqueue;

          for (let sel of flags.selector) {
            urlOptions.selector = sel;
            await enqueueUrls(urlOptions);  
          }
        }
      },
    });


    this.ux.info('Crawling...');
    const progress = new CLI.progress.Bar({}, CLI.progress.Presets.shades_grey);

    // If we're in 'verbose' mode, we'll be logging to screen rather than summarizing status.
    if (!flags.verbose) {
      progress.start(1, 0);
      spider.on('requestComplete', (stats: SpiderStatistics) => {
        progress.setTotal(stats.requestsEnqueued);
        progress.update(stats.requestsCompleted)
      });
    }

    await spider.run(urls).then(stats => { 
      if (!flags.silent) {
        if (!flags.verbose) {
          progress.setTotal(stats.requestsEnqueued);
          progress.update(stats.requestsCompleted)
          progress.stop();
        }
        this.summarizeResults(stats);
      }
    });
  }

  summarizeResults(stats: SpiderStatistics) {
    this.log();
    this.ux.styledJSON(stats);
    this.ux.styledHeader('Crawl complete.');
  }
}
