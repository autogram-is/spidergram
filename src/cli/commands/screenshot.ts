import {CLI, SpidergramCommand} from "../index.js";
import { Flags } from "@oclif/core";
import is from '@sindresorhus/is';
import { PlaywrightCrawler } from "crawlee";
import filenamify from "filenamify";
import humanizeUrl from "humanize-url";
import protocolify from "protocolify";
import {Readable} from 'node:stream';


type viewport = { width: number, height: number };
export const ViewportPresets: Record<string, viewport> = {
  iphone: { width: 320, height: 480 },
  ipad: { width: 768, height: 1024 },
  hd: { width: 1360, height: 768 },
  fhd: { width: 1920, height: 1080 }
}

export default class Screenshot extends SpidergramCommand {
  static summary = 'Save screenshots of pages and page elements';

  static usage = '<%= config.bin %> <%= command.id %>'

  static strict = false;

  static args = [{
    name: 'urls',
    description: 'One or more URLs to crawl',
  }];

  static flags = {
    config: CLI.globalFlags.config,
    selector: Flags.string({
      summary: 'CSS selector for element to capture',
      default: '',
    }),
    viewport: Flags.string({
      summary: 'Page viewport preset',
      default: 'hd',
    }),
    orientation: Flags.string({
      summary: 'Force viewport orientation',
      options: ['landscape', 'portrait', 'both'],
      default: [],
      dependsOn: ['viewport'],
    }),
    fullPage: Flags.boolean({
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
    const {project} = await this.getProjectContext();
    const {argv, flags} = await this.parse(Screenshot);
    const storage = project.files(flags.storage);
    storage.createDirectory(flags.directory);

    // build an array of Viewports to process
    const viewports = expandViewports(flags.viewport, flags.orientation);

    let urls: string[] = [];
    if (is.emptyArray(argv)) {
      const stdin = await this.stdin() ?? '';
      urls = stdin.match(/[\n\s]+/) ?? [];
    } else if (is.array<string>(argv)) {
      urls = argv;
    }
    if (is.emptyArray(urls)) this.ux.error('No URLs were provided.');

    const crawler = new PlaywrightCrawler({
      requestHandler: async (context) => {
        const {page} = context;
        for (let v in viewports) {
          await page.setViewportSize(viewports[v]);

          if (is.emptyStringOrWhitespace(flags.selector)) {
            await page.screenshot({
              fullPage: flags.fullPage,
              type: flags.format,
              scale: 'css',
            })
            .then(buffer => storage.writeStream(
              `${flags.directory}/${getFilename(page.url(), v)}.jpeg`,
              Readable.from(buffer)
            ));
          } else {
            const locator = page.locator(flags.selector);
            await locator.scrollIntoViewIfNeeded();
            await locator.screenshot({
              type: flags.format,
              scale: 'css',
            })
            .then(buffer => storage.writeStream(
              `${flags.directory}/${getFilename(page.url(), v)}.jpeg`,
              Readable.from(buffer)
            ));
          }

          this.ux.info(`Captured ${page.url()}`)
        }
      }
    });

    await crawler.run(urls.map(url => protocolify(url)));
  }
}

function getFilename(url: string, viewport: string) {
  return `${filenamify(humanizeUrl(url), {replacement: '-'})}-${viewport}`
}

function expandViewports(preset: string, orientation?: string): Record<string, viewport> {
  const output:Record<string, viewport> = {}
  
  const presets = presetToViewports(preset)

  for (let p in presets) {
    switch (orientation) {
      case 'portrait':
        output[`${p}-portrait`] = forcePortrait(presets[p]);
        break;
      case 'landscape':
        output[`${p}-landscape`] = forceLandscape(presets[p]);
        break;
      case 'both':
        output[`${p}-portrait`] = forcePortrait(presets[p]);
        output[`${p}-landscape`] = forceLandscape(presets[p]);
        break;
      default:
        output[p] = presets[p];
        break;
    }
  }
  return output;
}

function presetToViewports(input: string): Record<string, viewport> {
  let results: Record<string, viewport> = {};
  if (input === 'all') {
    results = ViewportPresets;
  } else if (input in ViewportPresets) {
    results[input] = ViewportPresets[input];
  } else {
    const components = input.match(/(\d+)[x,](\d+)/);
    if (components === null) {
      results.hd = ViewportPresets.hd;
    }
    else {
      results[input] = {
        width: Number.parseInt(components[1]),
        height: Number.parseInt(components[2]),
      };
    }
  }
  return results;
}

function isPortrait(input: viewport): boolean {
  return (input.height > input.width);
}

function rotateViewport(input: viewport): viewport {
  return { width: input.height, height: input.width };
}

function forcePortrait(input: viewport): viewport {
  return isPortrait(input) ? input : rotateViewport(input);
}

function forceLandscape(input: viewport): viewport {
  return isPortrait(input) ? rotateViewport(input) : input;
}