import { SgCommand } from '../../index.js';
import { Args } from '@oclif/core';
import { ParsedUrl, Spidergram } from '../../../index.js';
import { SpiderCli } from '../../shared/spider-cli.js';
import { NormalizedUrl } from '../../../index.js';
import is from '@sindresorhus/is';
export default class TestUrl extends SgCommand {
  static description = 'Test a URL with the current normalizer';

  static args = {
    url: Args.url({
      required: true
    })
  }

  static hidden = true;

  async run() {
    const { args } = await this.parse(TestUrl);
    const cli = new SpiderCli();
    const sg = await Spidergram.load();

    this.log(cli.header('Normalizer Settings:'))
    if (is.function_(sg.config.urlNormalizer)) {
      this.log('Custom function')
    } else {
      this.ux.styledObject(sg.config.urlNormalizer ?? false);
    }

    this.log(cli.header('Original URL:'))
    this.ux.styledJSON(new ParsedUrl(args.url.toString()));

    this.log(cli.header('Normalized URL:'))
    this.ux.styledJSON(new NormalizedUrl(args.url.toString()));
  }
}
