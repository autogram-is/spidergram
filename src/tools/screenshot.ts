import { Page } from "playwright";
import { Project } from "../index.js";
import is from '@sindresorhus/is';
import filenamify from "filenamify";
import humanizeUrl from "humanize-url";
import {Readable} from 'node:stream';
import {TDiskDriver} from "typefs";
import arrify from "arrify";

export interface Viewport {
  width: number,
  height: number,
}

export enum Orientation {
  portrait = 'portrait',
  landscape = 'landscape',
  both = 'both'
}

export interface ScreenshotOptions {
  storage?: TDiskDriver
  directory?: string,
  viewports?: string[],
  orientation?: Orientation,
  selectors?: string[],
  type?: 'jpeg' | 'png',
  fullPage?: boolean,
}

export class ScreenshotTool {
  private constructor() {}

  // Since this exists as a global const, new presets can
  // be added and removed at will. Knock yourself out.
  static ViewportPresets: Record<string, Viewport> = {
    iphone: { width: 320, height: 480 },
    ipad: { width: 768, height: 1024 },
    hd: { width: 1360, height: 768 },
    fhd: { width: 1920, height: 1080 }
  }

  static async capture(page: Page, options: ScreenshotOptions = {}) {
    let { storage, directory, viewports, orientation, selectors, fullPage, type } = options;
    
    storage ??= await Project.config().then(project => project.files())
    directory ??= 'screenshots';
    selectors ??= [];
    fullPage ??= true;
    type ??= 'jpeg';

    storage!.createDirectory(directory ?? '');
    const materializedViewports = this.expandViewports(viewports, orientation);

    for (let v in materializedViewports) {
      await page.setViewportSize(materializedViewports[v]);

      if (is.undefined(selectors) || is.emptyArray(selectors)) {
        await page.screenshot({
          fullPage,
          type,
          scale: 'css',
        })
        .then(buffer => storage!.writeStream(
          `${directory}/${this.getFilename(page.url(), v)}`,
          Readable.from(buffer)
        ));
      } else {
        for (let selector in selectors) {
          const locator = page.locator(selector);
          await locator.scrollIntoViewIfNeeded();
          await locator.screenshot({
            type,
            scale: 'css',
          })
          .then(buffer => storage!.writeStream(
            `${directory}/${this.getFilename(page.url(), v, selector)}`,
            Readable.from(buffer)
          ));
        }  
      }
    }
  }
  
  static presetsToViewports(input: string | string[]): Record<string, Viewport> {
    let results: Record<string, Viewport> = {};
    for (let k of arrify(input)) {
      if (k === 'all') {
        results = {
          ...results,
          ...this.ViewportPresets
        }
      } else if (k in this.ViewportPresets) {
        results[k] = this.ViewportPresets[k];
      } else {
        const components = k.match(/(\d+)[x,](\d+)/);
        if (components === null) {
          results.hd = this.ViewportPresets.hd;
        }
        else {
          results[k] = {
            width: Number.parseInt(components[1]),
            height: Number.parseInt(components[2]),
          };
        }
      }  
    }
    return results;
  }
  
  static isPortrait(input: Viewport): boolean {
    return (input.height > input.width);
  }
  
  static rotateViewport(input: Viewport): Viewport {
    return { width: input.height, height: input.width };
  }
  
  static forcePortrait(input: Viewport): Viewport {
    return this.isPortrait(input) ? input : this.rotateViewport(input);
  }
  
  static forceLandscape(input: Viewport): Viewport {
    return this.isPortrait(input) ? this.rotateViewport(input) : input;
  }

  static getFilename(url: string, viewport: string, selector?: string) {
    const components = [humanizeUrl(url), viewport, selector];
    return filenamify(components.join('.'), { replacement: '-'});
  }
  
  static expandViewports(names?: string | string[], orientation?: string): Record<string, Viewport> {
    const output:Record<string, Viewport> = {}
    const presets = (is.undefined(names)) ?
      { hd: this.ViewportPresets.hd } :
      this.presetsToViewports(names);
  
    for (let p in presets) {
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


