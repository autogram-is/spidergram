import { CLI, SgCommand, Spider, OutputLevel } from '../../index.js';
import { ParsedUrl, NormalizedUrl, NormalizedUrlSet } from '@autogram/url-tools';

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
    await this.getProjectContext();
    const { argv: urls, flags } = await this.parse(GetSitemap);

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    const urlSetOptions = {
      normalizer: (url: ParsedUrl) => {
        url.href = NormalizedUrl.normalizer(url).href; 
        url.pathname = 'sitemap.xml';
        return url;
      }
    }

    const sitemapList = new NormalizedUrlSet(urls, urlSetOptions);

    const spider = new Spider({
      urlOptions: {
        save: true,
        enqueue: false,
      }
    });
    const results = await spider.run(...sitemapList);
    this.ux.styledObject(results);
  }
}
