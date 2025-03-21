import { SgCommand, ScreenshotTool } from '../../index.js';
import { Flags, Args } from '@oclif/core';
import { PlaywrightCrawler } from 'crawlee';
import is from '@sindresorhus/is';
import { SpiderCli } from '../shared/spider-cli.js';

export default class Screenshot extends SgCommand {
  static summary = 'Save screenshots of pages and page elements';

  static usage = '<%= command.id %> [--viewport=<width,height>] <urls>';

  static examples = [
    '<%= config.bin %> <%= command.id %> --viewport=iphone --orientation=portrait example.com',
    '<%= config.bin %> <%= command.id %> --selector=".header" --viewport=all http://example.com',
  ];

  static strict = false;

  static args = {
    urls: Args.string({
      description: 'One or more URLs to capture',
      required: true,
    }),
  };

  static flags = {
    selector: Flags.string({
      summary: 'CSS selector for element to capture',
    }),
    limit: Flags.integer({
      summary: 'Max number of matching elements to capture',
    }),
    viewport: Flags.string({
      summary: 'Page viewport size',
      description:
        "Viewport can be a resolution in 'width,height' format; a preset name (iphone, ipad, hd, or fhd); or the preset 'all', which generates one screenshot for each defined preset.'",
      default: 'hd',
    }),
    orientation: Flags.string({
      summary: 'Force viewport orientation',
      description:
        "If no orientation is selected, the default for the viewport preset will be used. If 'both' is selected, two screenshots will be created for each viewport preset.",
      options: ['landscape', 'portrait', 'both'],
      required: false,
    }),
    fullpage: Flags.boolean({
      aliases: ['full'],
      summary: 'Scroll to capture full page contents',
      allowNo: true,
      default: true,
    }),
    directory: Flags.string({
      summary: 'Directory to store screenshots',
      default: 'screenshots',
    }),
    format: Flags.string({
      summary: 'Screenshot file format',
      options: ['jpeg', 'png'],
      default: 'jpeg',
    }),
  };

  async run() {
    const cli = new SpiderCli();
    const { argv: urls, flags } = await this.parse(Screenshot);

    if (!is.array<string>(urls)) {
      this.error('URLs must be strings.');
    }

    const captureTool = new ScreenshotTool({
      directory: flags.directory,
      viewports: [flags.viewport],
      orientation:
        flags.orientation === 'both'
          ? 'both'
          : flags.orientation === 'landscape'
          ? 'landscape'
          : 'portrait',
      storage: 'output',
      selectors: flags.selector ? [flags.selector] : undefined,
      type: flags.format === 'jpeg' ? 'jpeg' : 'png',
      fullPage: flags.fullpage,
      limit: flags.limit ?? Infinity,
    })
      .on(
        'progress',
        (status, message) => (this.ux.action.status = message ?? ''),
      )
      .on('end', status => {
        this.ux.action.stop();
        this.ux.info(cli.summarizeStatus(status));
      });

    const crawler = new PlaywrightCrawler({
      requestHandler: async ({ page }) => {
        this.ux.action.start(`Capturing ${page.url()}`);
        await captureTool.capture(page);
      },
    });

    await crawler.run(urls);
  }
}
