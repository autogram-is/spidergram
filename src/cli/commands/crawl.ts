import { Flags, Args } from '@oclif/core';
import { LogLevel } from 'crawlee';
import {
  Spidergram,
  Spider,
  EntityQuery,
  UniqueUrl,
  UniqueUrlSet,
  SpiderOptions,
} from '../../index.js';
import { QueryFragments } from '../../model/queries/query-fragments.js';
import { CLI, OutputLevel, SgCommand } from '../index.js';
import { filterUrl } from '../../tools/urls/filter-url.js';
import { SpiderCli } from '../shared/spider-cli.js';

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
      char: 'r',
      summary: 'Resume crawling already-discovered URLs',
      allowNo: true,
      default: true,
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
    const cli = new SpiderCli();
    const { argv: urls, flags } = await this.parse(Crawl);

    const crawlTargets = [...(sg.config.spider?.seed ?? []), ...(urls ?? [])];

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

    // If the crawl targets don't already exist in the database, add them
    if (crawlTargets.length) {
      const uus = new UniqueUrlSet(crawlTargets, { guessProtocol: true });
      await sg.arango.push([...uus.values()], false);
    }

    const options: Partial<SpiderOptions> = {
      urls: {
        save: flags.discover === 'none' ? () => false : flags.discover,
        crawl: flags.enqueue === 'none' ? () => false : flags.enqueue,
      },
    };
    options.logLevel = flags.verbose ? LogLevel.DEBUG : LogLevel.OFF;
    if (flags.concurrency) options.maxConcurrency = flags.concurrency;
    if (flags.rate) options.maxRequestsPerMinute = flags.rate;
    if (flags.download) options.downloadMimeTypes = flags.download;

    const spider = new Spider(options)
      .on('progress', status => this.updateProgress(status))
      .on('end', status => {
        this.stopProgress();
        this.log(cli.summarizeStatus(status));
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
        this.error('No uncrawled URLs matched the URL filter criteria.');
      } else {
        this.startProgress('Resuming crawl');
        await spider.resume(uus);
      }
    } else {
      this.startProgress('Crawling');
      await spider.run(crawlTargets);
    }

    return Promise.resolve();
  }
}
