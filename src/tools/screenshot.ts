import { Page, PageScreenshotOptions } from 'playwright';
import { Spidergram } from '../config/spidergram.js';
import is from '@sindresorhus/is';
import { Readable } from 'node:stream';
import arrify from 'arrify';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { JobStatus } from './job-status.js';
import { ensureDir } from 'fs-extra';
import path from 'node:path';

export interface Viewport {
  width: number;
  height: number;
}

export interface ScreenshotOptions {
  /**
   * The name of a storage bucket to save screenshots into.
   *
   * If no storage bucket is passed in, the project's default bucket is used.
   */
  storage?: string;

  /**
   * An optional subdirectory inside the storage bucket to use when saving the screenshots.
   *
   * @defaultValue {'screenshots'}
   * @type {string}
   */
  directory: string;

  /**
   * An array of strings specifying viewport sizes for the screen captures. Values can be:
   *
   * - Specific dimensions in the format 'WIDTHxHEIGHT' or 'WIDTH,HEIGHT'
   * - The name of a preset stored in `ScreenshotTool.ViewportPresets`
   * - The keyword 'all', which expands to *all* stored presets.
   *
   * @defaultValue {['hd']}
   * @type {string[]}
   */
  viewports: string[];

  /**
   * An orientation to use when capturing the screen. If no value is passed in, the viewport's
   * inherent orientation is used. If `both` is used, a screenshot is captured for
   * each orientation
   */
  orientation?: 'portrait' | 'landscape' | 'both';

  /**
   * CSS selectors used crop the captured image.
   *
   * If DOM elements matching the selectors in question can be found on the page, they
   * will be scrolled into view and the resulting capture will be cropped to the
   * dimensions of the DOM element.
   *
   * Honestly, haven't tested what happens if multiple selectors are matched on one page.
   *
   * @type {string[]}
   */
  selectors: string[];

  /**
   * Capture the full length of the page, even if it scrolls beyond the viewport boundaries.
   *
   * @defaultValue: false
   * @type {boolean}
   */
  fullPage: boolean;

  /**
   * File format for the screen capture.
   *
   * @defaultValue {'jpeg'}
   * @type {('jpeg' | 'png')}
   */
  type: 'jpeg' | 'png';

  /**
   * Maximium number of images to capture when multiple elements match the given selector.
   *
   * @defaultValue Infinity
   * @type {Number}
   */
  limit: number;
}

type ScreenshotEventMap = Record<PropertyKey, unknown[]> & {
  progress: [status: JobStatus, message?: string];
  end: [status: JobStatus];
};

type ScreenshotEventType = keyof ScreenshotEventMap;
type ScreenshotEventParams<T extends ScreenshotEventType> =
  ScreenshotEventMap[T];
type ScreenshotEventListener<T extends ScreenshotEventType> = (
  ...args: ScreenshotEventParams<T>
) => unknown;

export class ScreenshotTool {
  // Since this exists as a global const, new presets can
  // be added and removed at will. Knock yourself out.
  static ViewportPresets: Record<string, Viewport> = {
    iphone: { width: 320, height: 480 },
    ipad: { width: 768, height: 1024 },
    hd: { width: 1360, height: 768 },
    fhd: { width: 1920, height: 1080 },
  };

  protected events = new AsyncEventEmitter<ScreenshotEventMap>();

  status: JobStatus = {
    startTime: 0,
    finishTime: 0,
    finished: 0,
    failed: 0,
    total: 0,
  };

  on<T extends ScreenshotEventType>(
    event: T,
    listener: ScreenshotEventListener<T>,
  ): this {
    this.events.on<T>(event, listener);
    return this;
  }

  off<T extends ScreenshotEventType>(
    event: T,
    listener: ScreenshotEventListener<T>,
  ): this {
    if (listener) {
      this.events.removeListener<ScreenshotEventType>(event, listener);
      return this;
    } else {
      this.events.removeAllListeners<ScreenshotEventType>(event);
      return this;
    }
  }

  protected defaults: ScreenshotOptions = {
    directory: 'screenshots',
    viewports: ['hd'],
    orientation: undefined,
    selectors: [],
    type: 'png',
    fullPage: false,
    limit: 1_000,
  };

  constructor(public options: Partial<ScreenshotOptions> = {}) {}

  async capture(page: Page) {
    const sg = await Spidergram.load();
    const settings: ScreenshotOptions = {
      ...this.defaults,
      ...this.options,
    };

    const {
      directory,
      viewports,
      orientation,
      selectors,
      type,
      fullPage,
      limit,
    } = settings;

    const storage = sg.files(settings.storage);

    const materializedViewports = this.expandViewports(viewports, orientation);

    this.status.startTime = Date.now();
    this.status.total = Object.keys(materializedViewports).length;

    for (const v in materializedViewports) {
      await page.setViewportSize(materializedViewports[v]);
      const pwOptions: PageScreenshotOptions = { type, fullPage, scale: 'css' };

      if (is.undefined(selectors) || is.emptyArray(selectors)) {
        const filename = `${directory}/${this.getFilename(
          page.url(),
          v,
          undefined,
          fullPage
        )}.${type}`;
        if (fullPage === false) {
          pwOptions.clip = { x: 0, y: 0, ...materializedViewports[v] };
        }

        const buffer = await page.screenshot(pwOptions);
        const bin = path.join(
          sg.config.outputDirectory ??
            sg.config.storageDirectory ??
            './storage',
        );
        await ensureDir(path.join(bin, path.dirname(filename)));
        await storage.writeStream(filename, Readable.from(buffer));

        this.status.finished++;
        this.events.emit('progress', this.status, filename);
      } else {
        for (const selector of selectors) {
          let filename = `${directory}/${this.getFilename(
            page.url(),
            v,
            selector
          )}.${type}`;
          const max = Math.min(limit, await page.locator(selector).count());

          if (max === 0) {
            this.status.total++;
            this.status.finished++;
            this.events.emit('progress', this.status, 'No selectors matched');
            continue;
          } else {
            this.status.total += max;
          }

          for (let l = 0; l < max; l++) {
            const locator = page.locator(selector).nth(l);
            await locator.scrollIntoViewIfNeeded();
            if (l > 0) {
              filename = `${directory}/${this.getFilename(
                page.url(),
                v,
                selector
              )}-${l}.${type}`;
            }
            const buffer = await locator.screenshot(pwOptions);
            const bin = path.join(
              sg.config.outputDirectory ??
                sg.config.storageDirectory ??
                './storage',
            );
            await ensureDir(path.join(bin, path.dirname(filename)));
            await storage.writeStream(filename, Readable.from(buffer));

            this.status.finished++;
            this.events.emit('progress', this.status, filename);
          }
        }
      }
    }

    this.status.finishTime = Date.now();
    this.events.emit('end', this.status);
    return Promise.resolve(this.status);
  }

  protected presetsToViewports(
    input: string | string[],
  ): Record<string, Viewport> {
    let results: Record<string, Viewport> = {};
    for (const k of arrify(input)) {
      if (k === 'all') {
        results = {
          ...results,
          ...ScreenshotTool.ViewportPresets,
        };
      } else if (k in ScreenshotTool.ViewportPresets) {
        results[k] = ScreenshotTool.ViewportPresets[k];
      } else {
        const components = k.match(/(\d+)[x,](\d+)/);
        if (components === null) {
          results.hd = ScreenshotTool.ViewportPresets.hd;
        } else {
          results[k] = {
            width: Number.parseInt(components[1]),
            height: Number.parseInt(components[2]),
          };
        }
      }
    }
    return results;
  }

  protected isPortrait(input: Viewport): boolean {
    return input.height > input.width;
  }

  protected rotateViewport(input: Viewport): Viewport {
    return { width: input.height, height: input.width };
  }

  protected forcePortrait(input: Viewport): Viewport {
    return this.isPortrait(input) ? input : this.rotateViewport(input);
  }

  protected forceLandscape(input: Viewport): Viewport {
    return this.isPortrait(input) ? this.rotateViewport(input) : input;
  }

  // In theory, we could use this for subdirectories in addition to long filenames.
  protected getFilename(url: string, viewport: string, selector?: string, fullPage?: boolean) {
    let path = new URL(url).pathname.replaceAll('/', '-').slice(1);
    if (path.length === 0) path = 'index';
    const components = [new URL(url).hostname, path, fullPage ? `${viewport}-full` : viewport];
    if (selector) components.push(selector);
    return components
      .map(c => c.replaceAll(/<>:"\/\|?\*/g, '-'))
      .join('/')
      .replaceAll('--', '-');
  }

  protected expandViewports(
    names?: string | string[],
    orientation?: string,
  ): Record<string, Viewport> {
    const output: Record<string, Viewport> = {};
    const presets = is.undefined(names)
      ? { hd: ScreenshotTool.ViewportPresets.hd }
      : this.presetsToViewports(names);

    for (const p in presets) {
      switch (orientation) {
        case 'portrait':
          output[`${p}-portrait`] = this.forcePortrait(presets[p]);
          break;
        case 'landscape':
          output[`${p}-landscape`] = this.forceLandscape(presets[p]);
          break;
        case 'both':
          output[`${p}-portrait`] = this.forcePortrait(presets[p]);
          output[`${p}-landscape`] = this.forceLandscape(presets[p]);
          break;
        default:
          output[p] = presets[p];
          break;
      }
    }
    return output;
  }
}
