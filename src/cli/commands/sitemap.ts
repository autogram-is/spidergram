import { Args } from '@oclif/core';
import { Request } from 'crawlee';
import {
  NormalizedUrlSet,
  Spider,
  SpiderOptions,
  Spidergram,
} from '../../index.js';
import { CLI, OutputLevel, SgCommand } from '../index.js';
import { LogLevel } from 'crawlee';

export default class Sitemap extends SgCommand {
  static summary = 'Populate URLs from sitemaps';
  static strict = false

  static flags = {
    ...CLI.globalFlags,
    verbose: CLI.outputFlags.verbose,
  };

  static args = {
    urls: Args.string({
      description: 'URLs to scan',
      required: false,
    }),
  };

  async run() {
    const sg = await Spidergram.load();
    const { argv, flags } = await this.parse(Sitemap);
    const rawInput = [...sg.config.spider?.seed ?? [], ...argv]

    // Make a de-duplicated set of hostnames present in the input
    // and the configuration; we'll use those for robot and sitemap detection.
    const urls = new NormalizedUrlSet(
      rawInput.map(u => (typeof u === 'string') ? u : '').filter(u => u.length > 0),
      { strict: false,
        normalizer: url => {
          url.href = 'https://' + url.hostname.toLocaleLowerCase();
          return url;
        }
      }
    );

    if (urls.size == 0) {
      this.error(
        'No target URLs given.',
      );
    }

    const queue: Request[] = [];
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

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    // Don't crawl URLs unless they're robots.txt or sitemap.xml variants
    // This really demands a better override mechanism in the future.
    const options: Partial<SpiderOptions> = {
      urls: {
        save: true,
        crawl: { property: 'pathname', glob: '**/*.xml' }
      },
      maxConcurrency: 1,
      logLevel: flags.verbose ? LogLevel.DEBUG : LogLevel.OFF
    };

    const spider = new Spider(options)
      .on('progress', status => this.updateProgress(status))
      .on('end', status => {
        this.stopProgress();
        this.log(sg.cli.summarizeStatus(status));
      });

    this.startProgress('Downloading sitemaps');
    await spider.run(queue);

    return Promise.resolve();
  }
}