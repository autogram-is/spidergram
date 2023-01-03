import { Flags } from '@oclif/core';
import is from '@sindresorhus/is';
import { LogLevel } from 'crawlee';
import { Spider, SpiderStatus, EnqueueUrlOptions } from '../../index.js';
import { CLI, OutputLevel, SgCommand } from '../index.js';

export default class Crawl extends SgCommand {
  static summary = 'Crawl and store a site';

  static usage = '<%= config.bin %> <%= command.id %> <urls>';

  static examples = [
    '<%= config.bin %> <%= command.id %> example.com',
    '<%= config.bin %> <%= command.id %> --selector="section.main" --download="application/pdf" https://example.com',
  ];

  static flags = {
    ...CLI.globalFlags,
    erase: Flags.boolean({
      description: 'Erase database before crawling',
    }),
    ...CLI.crawlFlags,
    selector: Flags.string({
      summary: 'CSS selector for links',
    }),
    verbose: CLI.outputFlags.verbose,
  };

  static args = [
    {
      name: 'urls',
      description: 'One or more URLs to crawl',
      required: true,
    },
  ];

  static strict = false;

  async run() {
    const { project, graph, errors } = await this.getProjectContext();
    const { argv: urls, flags } = await this.parse(Crawl);

    if (errors.length > 0) {
      for (const error of errors) {
        if (is.error(error)) this.ux.error(error);
      }
    }

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    if (flags.erase) {
      const confirmation = await CLI.confirm(
        `Erase the ${project.name} database before crawling`,
      );
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
        const { $, saveResource, enqueueUrls } = context;

        await saveResource({ body: $?.html() });

        const urlOptions: Partial<EnqueueUrlOptions> = {};
        if (flags.discover !== 'none') {
          urlOptions.save = flags.discover;
          urlOptions.enqueue =
            flags.enqueue === 'none' ? () => false : flags.enqueue;

          if (flags.selector) {
            urlOptions.selector = flags.selector;
          }
          await enqueueUrls(urlOptions);
        }
      },
    });

    spider.on('requestComplete', status =>
      this.updateProgress(status as SpiderStatus),
    );
    this.startProgress('Crawling...');

    await spider.run(urls).then(status => {
      this.stopProgress();
      this.summarizeStatus(status);
    });
  }

  override summarizeStatus(stats: SpiderStatus) {
    this.log();
    this.ux.styledJSON(stats);
    this.ux.styledHeader('Crawl complete.');
  }
}
