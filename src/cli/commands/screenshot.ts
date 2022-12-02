import {
  CLI,
  SgCommand,
  ScreenshotTool,
  ScreenshotOptions,
  Orientation
} from "../../index.js";
import { Flags } from "@oclif/core";
import { PlaywrightCrawler } from "crawlee";

export default class Screenshot extends SgCommand {
  static summary = 'Save screenshots of pages and page elements';

  static usage = '<%= command.id %> [--viewport=<width,height>] <urls>'

  static examples = [
    '<%= config.bin %> <%= command.id %> --viewport=iphone --orientation=portrait example.com',
    '<%= config.bin %> <%= command.id %> --selector=".header" --viewport=all http://example.com',
  ];

  static strict = false;

  static args = [{
    name: 'urls',
    description: 'One or more URLs to capture',
    required: true,
  }];

  static flags = {
    config: CLI.globalFlags.config,
    selector: Flags.string({
      summary: 'CSS selector for element to capture',
    }),
    limit: Flags.integer({
      summary: 'Max number of matching elements to capture',
    }),
    viewport: Flags.string({
      summary: 'Page viewport size',
      description: "Viewport can be a resolution in 'width,height' format; a preset name (iphone, ipad, hd, or fhd); or the preset 'all', which generates one screenshot for each defined preset.'",
      default: 'hd',
    }),
    orientation: Flags.enum<Orientation>({
      summary: 'Force viewport orientation',
      description: "If no orientation is selected, the default for the viewport preset will be used. If 'both' is selected, two screenshots will be created for each viewport preset.",
      options: [
        Orientation.landscape,
        Orientation.portrait,
        Orientation.both
      ],
      required: false,
    }),
    'fullpage': Flags.boolean({
      aliases: ['full'],
      summary: 'Scroll to capture full page contents',
      allowNo: true,
      default: true
    }),
    directory: Flags.string({
      summary: 'Directory to store screenshots',
      default: 'screenshots'
    }),
    format: Flags.enum<'jpeg' | 'png'>({
      summary: 'Screenshot file format',
      options: ['jpeg', 'png'],
      default: 'jpeg'
    })
  }

  async run() {
    const {argv: urls, flags} = await this.parse(Screenshot);

    const captureTool = new ScreenshotTool();
    captureTool.on('capture', filename => this.ux.info(`Saved ${filename}...`));

    const options:Partial<ScreenshotOptions> = {
      directory: flags.directory,
      viewports: [flags.viewport],
      orientation: flags.orientation,
      selectors: flags.selector ? [flags.selector] : undefined,
      type: flags.format,
      fullPage: flags.fullpage,
      limit: flags.limit ?? Infinity
    }

    const crawler = new PlaywrightCrawler({
      requestHandler: async ({page}) => {
        await captureTool.capture(page, options);
      }
    });

    await crawler.run(urls);
  }
}
