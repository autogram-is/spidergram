import { SgCommand } from '../../index.js';
import { Args, Flags } from '@oclif/core';
import {
  ParsedUrl,
  SpiderContext,
  SpiderOptions,
  Spidergram,
  UniqueUrl,
  filterUrl,
} from '../../../index.js';
import { SpiderCli } from '../../shared/spider-cli.js';
import { NormalizedUrl } from '../../../index.js';
import is from '@sindresorhus/is';
import _ from 'lodash';

export default class TestUrl extends SgCommand {
  static description = 'Test a URL with the current normalizer';

  static flags = {
    config: Flags.boolean({
      char: 'c',
      summary: 'Display current URL related configuration',
    }),
    base: Flags.url({
      char: 'b',
      summary: "A URL to treat as the 'current' one",
    }),
    details: Flags.url({
      char: 'd',
      summary: "A URL to treat as the 'current' one",
    }),
  };

  static args = {
    urls: Args.string({
      description: 'One or more URLs to test',
    }),
  };

  static hidden = true;

  async run() {
    const { flags, argv } = await this.parse(TestUrl);
    const cli = new SpiderCli();
    const sg = await Spidergram.load();

    const saveRule = sg.config.spider?.urls?.save;
    const enqueueRule = sg.config.spider?.urls?.crawl;

    const fakeContext: SpiderContext = _.cloneDeep(
      sg.config.spider,
    ) as SpiderContext;
    if (flags.base) {
      fakeContext.urls.baseUrl = flags.base.toString();
      fakeContext.uniqueUrl = new UniqueUrl({ url: fakeContext.urls.baseUrl });
    }

    if (flags.config) {
      this.log(cli.header('Save URLs matching:'));
      if (is.function_(saveRule)) {
        this.log('Custom function');
      } else if (is.string(saveRule)) {
        console.log(saveRule);
      } else {
        this.ux.styledObject(saveRule);
      }

      this.log(cli.header('Crawl URLs matching:'));
      if (is.function_(enqueueRule)) {
        this.log('Custom function');
      } else if (is.string(enqueueRule)) {
        console.log(enqueueRule);
      } else {
        this.ux.styledObject(enqueueRule);
      }

      this.log(cli.header('Normalizer Settings:'));
      if (is.function_(sg.config.urlNormalizer)) {
        this.log('Custom function');
      } else {
        this.ux.styledObject(sg.config.urlNormalizer ?? false);
      }
    }

    if (argv.length > 0 && typeof argv[0] === 'string') {
      this.singleUrl(argv[0], fakeContext);
    }
  }

  singleUrl(url: string, opt: SpiderContext) {
    const cli = new SpiderCli();
    this.log(cli.header('URL'));

    const parsed = this.softParse(url, opt);
    const normalized = this.softNormalize(url, opt);

    let matches = {
      save: false,
      crawl: false,
    };
    if (normalized) {
      matches = this.checkUrl(normalized, opt);
    }

    this.log(
      cli.infoList({
        Raw: url,
        Parsed: (parsed ?? this.chalk.bold.red('malformed')).toString(),
        Normalized: (normalized ?? this.chalk.bold.red('malformed')).toString(),
        'Will be saved': matches.save
          ? this.chalk.bold.green('yes')
          : this.chalk.bold.red('no'),
        'Will be crawled': matches.crawl
          ? this.chalk.bold.green('yes')
          : this.chalk.bold.red('no'),
      }),
    );
  }

  softNormalize(url: string, opt: SpiderOptions) {
    try {
      return new NormalizedUrl(url, opt.urls.baseUrl);
    } catch {
      return undefined;
    }
  }

  softParse(url: string, opt: SpiderOptions) {
    try {
      return new ParsedUrl(url, opt.urls.baseUrl);
    } catch {
      return undefined;
    }
  }

  checkUrl(url: NormalizedUrl, opt: SpiderContext) {
    let base: ParsedUrl | undefined = undefined;
    if (opt.urls.baseUrl) {
      base = new ParsedUrl(opt.urls.baseUrl);
    }
    return {
      save: filterUrl(url, opt.urls.save, base),
      crawl: filterUrl(url, opt.urls.crawl, base),
    };
  }
}
