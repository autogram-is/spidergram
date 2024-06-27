import { Args } from '@oclif/core';
import { Spidergram, SgCommand } from '../../index.js';
import { launchPlaywright } from 'crawlee';

export default class Ping extends SgCommand {
  static summary = 'Log in to a site and save the resulting cookies';

  static usage = '<%= config.bin %> <%= command.id %> [url]';

  static args = {
    url: Args.url({
      description: 'A valid URL with a standard login form',
      required: true,
    }),
  };

  static strict = false;

  async run() {
    const sg = await Spidergram.load();
    const { args } = await this.parse(Ping);

    const browser = await launchPlaywright({
      launchOptions: { headless: false },
    });
    const browserContext = browser.contexts()[0];
    const page = await browserContext.newPage();

    this.log('Log in, then return to the terminal.');

    await page.goto(args.url.toString(), {
      waitUntil: sg.config.spider?.waitUntil,
    });

    await this.ux.anykey('Press any key here AFTER logging in');

    const cookies = await page.context().cookies();

    this.ux.styledObject(cookies);

    await page.close();
    await browser.close();

    sg.files('output').write(
      'cookies.json',
      Buffer.from(
        JSON.stringify({ spider: { cookies: cookies } }, undefined, 2),
      ),
    );
  }
}
