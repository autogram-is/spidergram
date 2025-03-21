import { Flags, Args } from '@oclif/core';
import {
  Spidergram,
  Spider,
  WorkerQuery,
  GraphTools,
  Resource,
  ReportRunner,
} from '../../index.js';
import { CLI, SgCommand } from '../index.js';
import { SpiderCli } from '../shared/spider-cli.js';

export default class Go extends SgCommand {
  static summary = 'Crawl and analyze a site, then generate a report.';

  static usage = '<%= config.bin %> <%= command.id %> <urls>';

  static flags = {
    ...CLI.globalFlags,
    erase: Flags.boolean({
      description: 'Erase database before crawling',
    }),
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
    const { argv: urls, flags } = await this.parse(Go);

    const crawlTargets: string[] = [
      ...(sg.config.spider?.seed ?? []),
      ...(urls ?? []),
    ];

    if (crawlTargets.length == 0) {
      this.error(
        'Crawl URLs must be provided via the command line, or via the configuration file.',
      );
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

    // Crawl
    const spider = new Spider()
      .on('progress', status => this.updateProgress(status))
      .on('end', () => this.stopProgress());

    this.startProgress('Crawling URLs');
    await spider
      .run(crawlTargets)
      .then(status => this.ux.info(cli.summarizeStatus(status)));

    // Analyze
    const analyzer = new WorkerQuery<Resource>('resources')
      .on('progress', status => this.updateProgress(status))
      .on('end', () => this.stopProgress());

    this.startProgress('Analyzing crawled resources');
    await analyzer
      .run(async resource => {
        return GraphTools.analyzePage(resource)
          .then(resource => sg.arango.push(resource))
          .then(() => resource.url);
      })
      .then(status => this.ux.info(cli.summarizeStatus(status)));

    // Report
    for (const [name, report] of Object.entries(sg.config.reports ?? {})) {
      const r = new ReportRunner({ name, ...report })
        .on('progress', message => {
          if (message) this.ux.action.status;
        })
        .on('end', () => this.ux.action.stop());

      this.ux.action.start('Crawl reports');
      await r.run();
      this.log(
        `Saved ${
          r.status.files.length === 1
            ? '1 report'
            : r.status.files.length + ' reports'
        }`,
      );
      r.status.files.map(file => this.log(`  ${file}`));
    }

    // We should perform some kin of wrapup step here.
    return Promise.resolve();
  }
}
