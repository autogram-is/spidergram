import {
  CLI,
  SgCommand,
  Spider,
  OutputLevel,
  UrlMatchStrategy,
  UniqueUrlSet,
} from '../../index.js';
import { Args } from '@oclif/core';
import { ParsedUrl } from '@autogram/url-tools';
import is from '@sindresorhus/is';

export default class GetSitemap extends SgCommand {
  static summary = 'Retrieve and analyze sitemap data';

  static usage = '<%= config.bin %> <%= command.id %> [urls]';

  static flags = {
    ...CLI.globalFlags,
  };

  static strict = false;

  static args = {
    urls: Args.url({
      description: 'One or more domains to examine',
      required: true
    }),
  }

  async run() {
    const { argv: urls, flags } = await this.parse(GetSitemap);

    if (!is.array<string>(urls)) {
      this.error('URLs must be strings.');
    }


    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    const rOptions = {
      keepUnparsable: false,
      guessProtocol: true,
      userData: { handler: 'robotstxt' },
      normalizer: (url: ParsedUrl) => {
        url.pathname = '/robots.txt';
        return url;
      },
    };
    const robots = new UniqueUrlSet([...urls], rOptions);

    const sOptions = {
      keepUnparsable: false,
      guessProtocol: true,
      userData: { handler: 'sitemap' },
      normalizer: (url: ParsedUrl) => {
        url.pathname = '/sitemap.xml';
        return url;
      },
    };
    const sitemaps = new UniqueUrlSet([...urls], sOptions);

    const spider = new Spider({
      urlOptions: {
        save: UrlMatchStrategy.All,
        enqueue: '**/{*.xml,robots.txt}',
      },
      maxConcurrency: 1,
    });
    const results = await spider.run([...robots, ...sitemaps]);
    this.ux.styledObject(results);
  }
}
