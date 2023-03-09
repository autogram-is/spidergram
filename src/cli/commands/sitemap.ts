import {
  CLI,
  SgCommand,
  Spider,
  OutputLevel,
  UrlMatchStrategy,
  UniqueUrlSet,
} from '../../index.js';
import { ParsedUrl } from '@autogram/url-tools';

export default class GetSitemap extends SgCommand {
  static summary = 'Retrieve and analyze sitemap data';

  static usage = '<%= config.bin %> <%= command.id %> [urls]';

  static flags = {
    ...CLI.globalFlags,
  };

  static args = [
    {
      name: 'urls',
      description: 'One or more domains to examine',
      multiple: true,
    },
  ];

  static strict = false;

  async run() {
    const { argv: urls, flags } = await this.parse(GetSitemap);

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
