import { Args, Flags } from '@oclif/core';
import { Request } from 'crawlee';
import {
  EntityQuery,
  NormalizedUrlSet,
  QueryFragments,
  Spider,
  SpiderOptions,
  Spidergram,
  UniqueUrl,
} from '../../index.js';
import { CLI, OutputLevel, SgCommand } from '../index.js';
import { LogLevel } from 'crawlee';

export default class Sitemap extends SgCommand {
  static summary = 'Populate URLs from sitemaps';
  static strict = false

  static flags = {
    ...CLI.globalFlags,
    verbose: CLI.outputFlags.verbose,
    resume: Flags.boolean({
      char: 'r',
      summary: 'Retrieve known but uncrawled sitemaps',
      allowNo: true,
      default: true,
    })
  };

  static args = {
    urls: Args.string({
      description: 'Hosts to scan for sitemaps',
      required: false,
    }),
  };

  async run() {
    const sg = await Spidergram.load();
    const { argv, flags } = await this.parse(Sitemap);
    const rawInput = [...sg.config.spider?.seed ?? [], ...argv]

    const queue: Request[] = [];


    if (flags.resume) {
      // Grab any existing uncrawled robots.txt or sitemap URLs
      const uq = new EntityQuery<UniqueUrl>(QueryFragments.urls_uncrawled).filterBy('handler',['robotstxt', 'sitemap']);
      const uus = await uq.run();
      for (const uu of uus) {
        queue.push(new Request({ url: uu.url, label: uu.label }));
      }
      this.log(`Queueing ${uus.length} known sitemaps`)
    }

    const urls = new NormalizedUrlSet(
      rawInput.map(u => (typeof u === 'string') ? u : '').filter(u => u.length > 0),
      { strict: false,
        normalizer: url => {
          url.href = 'https://' + url.hostname.toLocaleLowerCase();
          return url;
        }
      }
    );
    if (urls.size) {
      this.log(`Queuing ${urls.size} additional hosts`)
    }

    for (const url of [...urls]) {
      queue.push(new Request({
        url: url.toString() + 'robots.txt',
        label: 'robotstxt'
      }))
      queue.push(new Request({
        url: url.toString() + 'sitemap.xml',
        label: 'sitemap'
      }))
    }

    if (queue.length == 0) {
      this.error('No hostnames or sitemaps were given.');
    }

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    // Don't crawl URLs unless they're robots.txt or sitemap.xml variants
    // This really demands a better override mechanism in the future.
    const options: Partial<SpiderOptions> = {
      urls: {
        save: true,
        crawl: { property: 'pathname', glob: '{/**/*.xml,/robots.txt}' }
      },
      maxConcurrency: 4,
      logLevel: flags.verbose ? LogLevel.DEBUG : LogLevel.OFF
    };

    const spider = new Spider(options)
      .on('progress', status => this.updateProgress(status))
      .on('end', status => {
        this.stopProgress();
        this.log(sg.cli.summarizeStatus(status));
      });

    this.startProgress('Retrieving sitemaps');
    await spider.run(queue);

    return Promise.resolve();
  }
}