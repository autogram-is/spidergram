import { Page, PageScreenshotOptions } from "playwright";
import { Project } from "../index.js";
import is from '@sindresorhus/is';
import filenamify from "filenamify";
import humanizeUrl from "humanize-url";
import {Readable} from 'node:stream';
import {TDiskDriver} from "typefs";
import arrify from "arrify";
import { AsyncEventEmitter } from "@vladfrangu/async_event_emitter";

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

export class ScreenshotTool extends AsyncEventEmitter {
  // Since this exists as a global const, new presets can
  // be added and removed at will. Knock yourself out.
  static ViewportPresets: Record<string, Viewport> = {
    iphone: { width: 320, height: 480 },
    ipad: { width: 768, height: 1024 },
    hd: { width: 1360, height: 768 },
    fhd: { width: 1920, height: 1080 }
  }

  eventNames(): (string | number | symbol)[] {
    return ['capture', 'error'];
  }

  async capture(page: Page, options: ScreenshotOptions = {}) {
    let { storage, directory, viewports, orientation, selectors, fullPage, type } = options;
    storage ??= await Project.config().then(project => project.files());
    directory ??= 'screenshots';
    selectors ??= [];
    type ??= 'jpeg';
    
    const results: string[] = [];

    const materializedViewports = this.expandViewports(viewports, orientation);
    for (let v in materializedViewports) {
      await page.setViewportSize(materializedViewports[v]);
      let options:PageScreenshotOptions = { type, fullPage, scale: 'css' };
      
      if (is.undefined(selectors) || is.emptyArray(selectors)) {
        const filename = `${directory}/${this.getFilename(page.url(), v, undefined, fullPage)}.${type}`;
        if (!fullPage) {
          options.clip = { x: 0, y: 0, ...materializedViewports[v] }
        }

        const buffer = await page.screenshot(options);
        await storage!.writeStream(filename, Readable.from(buffer));
        this.emit('capture', filename);
        results.push(filename);
      } else {
        for (let selector in selectors) {
          const filename = `${directory}/${this.getFilename(page.url(), v, selector, fullPage)}.${type}`;
          const locator = page.locator(selector);
          
          await page.locator(selector).scrollIntoViewIfNeeded();
          const buffer = await locator.screenshot(options);
          await storage!.writeStream(filename, Readable.from(buffer));
          this.emit('capture', filename);
          results.push(filename);
        }  
      }
    }

    return Promise.resolve(results);
  }
  
  presetsToViewports(input: string | string[]): Record<string, Viewport> {
    let results: Record<string, Viewport> = {};
    for (let k of arrify(input)) {
      if (k === 'all') {
        results = {
          ...results,
          ...ScreenshotTool.ViewportPresets
        }
      } else if (k in ScreenshotTool.ViewportPresets) {
        results[k] = ScreenshotTool.ViewportPresets[k];
      } else {
        const components = k.match(/(\d+)[x,](\d+)/);
        if (components === null) {
          results.hd = ScreenshotTool.ViewportPresets.hd;
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
  
  isPortrait(input: Viewport): boolean {
    return (input.height > input.width);
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
  getFilename(url: string, viewport: string, selector?: string, infinite = false) {
    const components = [humanizeUrl(url), viewport];
    if (selector) components.push(selector);
    if (infinite) components.push('cropped');
    return filenamify(components.join('-'), { replacement: '-'}).replace('--', '-');
  }
  
  expandViewports(names?: string | string[], orientation?: string): Record<string, Viewport> {
    const output:Record<string, Viewport> = {}
    const presets = (is.undefined(names)) ?
      { hd: ScreenshotTool.ViewportPresets.hd } :
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


