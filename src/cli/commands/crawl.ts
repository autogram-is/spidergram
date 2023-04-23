import { Flags, Args } from '@oclif/core';
import { LogLevel } from 'crawlee';
import {
  Spidergram,
  Spider,
  EntityQuery,
  UniqueUrl,
} from '../../index.js';
import { QueryFragments } from '../../model/queries/query-fragments.js';
import { CLI, OutputLevel, SgCommand } from '../index.js';
import { filterUrl } from '../../tools/urls/filter-url.js';

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
    resume: Flags.boolean({
      description: 'Resume a stopped crawl',
    }),
    ...CLI.crawlFlags,
    verbose: CLI.outputFlags.verbose,
  };

  static args = {
    urls: Args.string({
      description: 'One or more URLs to crawl',
    }),
  };

  static strict = false;

  async run() {
    const sg = await Spidergram.load();
    const { argv: urls, flags } = await this.parse(Crawl);

    const crawlTargets = [...sg.config.spider?.seed ?? [], ...urls ?? []];

    if (crawlTargets.length == 0) {
      this.error('Crawl URLs must be provided via the command line, or via the configuration file.');
    }

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    if (flags.erase) {
      const confirmation = await CLI.confirm(
        `Erase the ${
          sg.config.arango?.databaseName ?? 'spidergram'
        } database before crawling`,
      );
      if (confirmation) {
        await sg.arango.erase({ eraseAll: true });
      }
    }

    const spider = new Spider({
      logLevel: flags.verbose ? LogLevel.DEBUG : LogLevel.OFF,
      maxConcurrency: flags.concurrency,
      maxRequestsPerMinute: flags.rate,
      downloadMimeTypes: flags.download,
      urls: {
        save: flags.discover === 'none' ? () => false : flags.discover,
        crawl: flags.enqueue === 'none' ? () => false : flags.enqueue,
      },
    });
    spider.on('progress', status => this.updateProgress(status));
    spider.on('end', status => {
      this.stopProgress();
      this.log(sg.cli.summarizeStatus(status));
    });

    if (flags.resume && flags.enqueue !== 'none') {
      this.ux.action.start('Retrieving already-queued URLs');
      const uq = new EntityQuery<UniqueUrl>(QueryFragments.urls_uncrawled);

      const uus = await uq
        .run()
        .then(uus =>
          uus.filter(uu =>
            uu.parsed
              ? filterUrl(
                  uu.parsed,
                  flags.enqueue ?? sg.config.spider?.urls?.crawl,
                  { contextUrl: crawlTargets[0] },
                )
              : false,
          ),
        );
      this.ux.action.stop(`${uus.length} found.`);

      if (uus.length === 0) {
        this.error('No uncrawled URLs matched the requested domains.');
      } else {
        this.startProgress('Resuming crawl');
        await spider.resume(uus);
      }
    } else {
      this.startProgress('Crawling');
      await spider.run(crawlTargets);
    }
  }
}
