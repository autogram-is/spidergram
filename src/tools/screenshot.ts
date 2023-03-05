import { Page, PageScreenshotOptions } from 'playwright';
import { Project } from '../index.js';
import is from '@sindresorhus/is';
import { Readable } from 'node:stream';
import { DiskDriver } from 'typefs';
import arrify from 'arrify';
import { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';

export interface Viewport {
  width: number;
  height: number;
}

export enum Orientation {
  portrait = 'portrait',
  landscape = 'landscape',
  both = 'both',
}

export interface ScreenshotOptions {
  /**
   * A TypeFS disk driver instance; can be obtained by calling `await Project.files()`
   * in code that already has a Spidergram Project context.
   *
   * If no storage bucket is passed in, the project's default bucket is used.
   *
   * @type {?DiskDriver}
   */
  storage?: DiskDriver;

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
   * inherent orientation is used. If `Orientation.both` is used, a screenshot is captured for
   * each orientation
   *
   * @type {?Orientation}
   */
  orientation?: Orientation;

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

export class ScreenshotTool extends AsyncEventEmitter<{
  capture: [filename: string];
}> {
  // Since this exists as a global const, new presets can
  // be added and removed at will. Knock yourself out.
  static ViewportPresets: Record<string, Viewport> = {
    iphone: { width: 320, height: 480 },
    ipad: { width: 768, height: 1024 },
    hd: { width: 1360, height: 768 },
    fhd: { width: 1920, height: 1080 },
  };

  protected defaults: ScreenshotOptions = {
    directory: 'screenshots',
    viewports: ['hd'],
    orientation: undefined,
    selectors: [],
    type: 'png',
    fullPage: false,
    limit: Infinity,
  };

  async capture(page: Page, options: Partial<ScreenshotOptions> = {}) {
    const settings: ScreenshotOptions & { storage: DiskDriver } = {
      ...this.defaults,
      storage: await Project.config().then(project => project.files()),
      ...options,
    };
    const {
      storage,
      directory,
      viewports,
      orientation,
      selectors,
      type,
      fullPage,
      limit,
    } = settings;

    const results: string[] = [];

    const materializedViewports = this.expandViewports(viewports, orientation);
    for (const v in materializedViewports) {
      await page.setViewportSize(materializedViewports[v]);
      const pwOptions: PageScreenshotOptions = { type, fullPage, scale: 'css' };

      if (is.undefined(selectors) || is.emptyArray(selectors)) {
        const filename = `${directory}/${this.getFilename(
          page.url(),
          v,
          undefined,
          fullPage,
        )}.${type}`;
        if (fullPage === false) {
          pwOptions.clip = { x: 0, y: 0, ...materializedViewports[v] };
        }

        const buffer = await page.screenshot(pwOptions);
        await storage.writeStream(filename, Readable.from(buffer));
        this.emit('capture', filename);
        results.push(filename);
      } else {
        for (const selector of selectors) {
          let filename = `${directory}/${this.getFilename(
            page.url(),
            v,
            selector,
            fullPage,
          )}.${type}`;
          const max = Math.min(limit, await page.locator(selector).count());

          if (max === 0) continue;

          for (let l = 0; l < max; l++) {
            const locator = page.locator(selector).nth(l);
            await locator.scrollIntoViewIfNeeded();
            if (l > 0) {
              filename = `${directory}/${this.getFilename(
                page.url(),
                v,
                selector,
                fullPage,
              )}-${l}.${type}`;
            }
            const buffer = await locator.screenshot(pwOptions);
            await storage.writeStream(filename, Readable.from(buffer));
            this.emit('capture', filename);
            results.push(filename);
          }
        }
      }
    }

    return Promise.resolve(results);
  }

  presetsToViewports(input: string | string[]): Record<string, Viewport> {
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

  isPortrait(input: Viewport): boolean {
    return input.height > input.width;
  }

  rotateViewport(input: Viewport): Viewport {
    return { width: input.height, height: input.width };
  }

  forcePortrait(input: Viewport): Viewport {
    return this.isPortrait(input) ? input : this.rotateViewport(input);
  }

  forceLandscape(input: Viewport): Viewport {
    return this.isPortrait(input) ? this.rotateViewport(input) : input;
  }

  // In theory, we could use this for subdirectories in addition to long filenames.
  getFilename(
    url: string,
    viewport: string,
    selector?: string,
    infinite = true,
  ) {
    const components = [new URL(url).hostname, viewport];
    if (selector) components.push(selector);
    if (!infinite) components.push('cropped');
    return components.join('-').replaceAll(/<>:"\/\|?\*/g, '-').replaceAll('--','-');
  }

  expandViewports(
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
