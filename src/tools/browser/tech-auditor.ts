import { parse as parseCookie } from 'set-cookie-parser';
import wlc, { Resolution } from 'wappalyzer-core';
import _ from 'lodash';
import is from '@sindresorhus/is';
import { Spidergram, Resource, HtmlTools } from '../../index.js';

const { analyze, resolve, setCategories, setTechnologies, technologies } = wlc;

import type {
  Technology as PageTechDefinition,
  Category as PageTechCategory,
  Input as PageTechFingerprint,
  Resolution as PageTechnology,
} from 'wappalyzer-core';
import { getCheerio } from '../html/get-cheerio.js';
import { Page } from 'playwright';

export type {
  Technology as PageTechDefinition,
  Category as PageTechCategory,
  Input as PageTechFingerprint,
  Resolution as PageTechnology,
} from 'wappalyzer-core';

/**
 * Options for detecting the technologies used on a given page.
 *
 * Spidergram's technology fingerprinting relies on the {@link https://github.com/wappalyzer/wappalyzer|wappalyzer},
 * library, and full documentation on that project can be found at that project's home page.
 */
export interface TechAuditOptions {
  /**
   * An array of custom {@link PageTechDefinition} definitions to use in addition to
   * the base tech library.
   */
  technologies?: Record<string, PageTechDefinition>;

  /**
   * An array of custom {@link PageTechCategory} definitions to supplement the base
   * tech categories.
   */
  categories?: Record<string, PageTechCategory>;

  /**
   * Rebuild the local cache of technology definitions; remote copies of the technology
   * and category JSON files will be downloaded and cached.
   */
  forceReload?: boolean;

  /**
   * The remote URL of a category definition file.
   *
   * @type {?string}
   */
  categoriesUrl?: string;

  /**
   * The remote URL of a technology definition file.
   *
   * @type {?string}
   */
  technologiesUrl?: string;
}

export class TechAuditor {
  static loaded = false;
  static techs: Record<string, PageTechDefinition> = {};
  static cats: Record<string, PageTechCategory> = {};

  static async run(
    input: string | cheerio.Root | Response | Resource | undefined,
    fp: PageTechFingerprint = {},
  ): Promise<PageTechnology[]> {
    await this.init();
    
    if (typeof input === 'string') {
      fp = { ...fp, ...(await TechAuditor.extractBodyData(input)) };
    } else if (is.function_(input)) {
      fp = { ...fp, ...(await TechAuditor.extractBodyData(input.html())) };
    } else if (input instanceof Resource) {
      fp = { ...fp, ...(await TechAuditor.extractResourceInput(input)) };
    } else if (input instanceof Response) {
      fp = { ...fp, ...(await TechAuditor.extractResponseInput(input)) };
    }
    
    const found = analyze(fp);
    found.push(...TechAuditor.getDomDetections(fp));
    return analyze(fp)
      .then(output => [...output, ])
    return Promise.resolve(resolve());
  }


  /**
   * DomDetections uses the 
   */
  static getDomDetections(input: wlc.Input): PageTechnology[] {
    const html = input.html ?? '';
    if (is.emptyStringOrWhitespace(html)) return [];
    const $ = getCheerio(html);
    const foundTech: Resolution[] = [];

    for (const tech of technologies) {
      const { name, dom } = tech;
      if (!is.object(dom)) continue;

      // Loop through the dom selectors for the current technology.
      Object.keys(dom).forEach(selector => {
        let nodes: cheerio.Element[] = [];
        try {
          nodes = $(selector).toArray();
        } catch (error: unknown) {
          // Continue
        }
        if (!nodes.length) {
          return
        }

        dom[selector].forEach(({ exists, text, properties, attributes }) => {
          nodes.forEach(node => {
            // Wappalyzer post-processes things into a flat array of technologies,
            // each with a name property. This seems to be bailing out if more than
            // 50 technologies share the same name, but it's unclear how that could happen.
            if (
              foundTech.filter(tech => tech.name === name).length >= 50
            ) {
              return
            }

            // If an 'exists' detector for this technology/selector pair hasn't been added
            // to the detections mix yet, add it.
            if (
              exists &&
              foundTech.findIndex(t => name === t.name && selector === t.selector && exists === '') === -1
            ) {
              foundTech.push({
                name,
                selector,
                exists: '',
              })
            }
          })
        });
        return tech;
      }, []);
    };

    return foundTech;
  }

  static async getScriptDetections(page: Page): Promise<PageTechnology[]> {
    return Promise.resolve([]);
  }

  static async init(customOptions: TechAuditOptions = {}) {
    const sg = await Spidergram.load();
    const options: TechAuditOptions = _.defaultsDeep(
      customOptions,
      sg.config.pageTechnologies,
    );

    if (!this.loaded || options.forceReload) {
      let categories: Record<string, PageTechCategory> = {};
      let technology: Record<string, PageTechDefinition> = {};

      const catIsCached = await sg.files().exists('tech-categories-cache.json');
      const techIsCached = await sg
        .files()
        .exists('tech-definitions-cache.json');

      if (!catIsCached)
        await this.cacheCategories(
          options.categoriesUrl ??
            'https://raw.githubusercontent.com/wappalyzer/wappalyzer/master/src/categories.json',
        );

      if (!techIsCached) {
        await this.cacheTechnologies(
          options.technologiesUrl ??
            'https://raw.githubusercontent.com/wappalyzer/wappalyzer/master/src/technologies',
        );
      }

      let json = (
        await sg.files().read('tech-categories-cache.json')
      ).toString();
      categories = JSON.parse(json) as Record<string, PageTechCategory>;

      json = (await sg.files().read('tech-definitions-cache.json')).toString();
      technology = JSON.parse(json) as Record<string, PageTechDefinition>;

      setCategories(_.merge(categories, options.categories));
      setTechnologies(_.merge(technology, options.technologies));

      this.loaded = true;
    }

    return Promise.resolve();
  }

  protected static async cacheTechnologies(techUrl: string) {
    const project = await Spidergram.load();

    const chars = Array.from({ length: 27 }, (value, index) =>
      index ? String.fromCharCode(index + 96) : '_',
    );

    const data = await Promise.all(
      chars.map(async char => {
        const url = new URL(`${techUrl}/${char}.json`);
        return await fetch(url).then(response => response.json());
      }),
    );

    const technologies = data.reduce(
      (acc, obj) => ({
        ...acc,
        ...obj,
      }),
      {},
    );

    return project
      .files()
      .write(
        'tech-definitions-cache.json',
        Buffer.from(JSON.stringify(technologies)),
      );
  }

  protected static async cacheCategories(catUrl: string) {
    const project = await Spidergram.load();

    const url = new URL(catUrl);
    const categories = await fetch(url).then(response => response.json());
    return project
      .files()
      .write(
        'tech-categories-cache.json',
        Buffer.from(JSON.stringify(categories)),
      );
  }

  protected static async extractBodyData(
    html: string,
  ): Promise<PageTechFingerprint> {
    const data = await HtmlTools.getPageData(html, { all: true });

    const input: PageTechFingerprint = {
      html,
      meta: this.wapifyDict(data.meta ?? {}),
    };

    input.scriptSrc = [];
    input.scripts = '';
    input.css = '';

    for (const script of Object.values(data.scripts ?? {})) {
      if ('src' in script && script.src !== undefined) {
        input.scriptSrc.push(script.src);
      } else {
        input.scripts += script.content ?? '';
      }
    }

    for (const style of Object.values(data.styles ?? {})) {
      if ('content' in style && style.content !== undefined) {
        input.css += style.content;
      }
    }

    return input;
  }

  protected static async extractResponseInput(
    res: Response,
  ): Promise<PageTechFingerprint> {
    const input: PageTechFingerprint = {
      url: res.url,
      ...(await this.extractBodyData(await res.text())),
    };

    res.headers.forEach((value, key) => {
      input.headers ??= {};
      input.cookies ??= {};

      if (key.toLocaleLowerCase() === 'set-cookie') {
        const cookies = parseCookie(value);
        for (const cookie of cookies) {
          input.cookies[cookie.name] = [cookie.value];
        }
      } else {
        input.headers[key.toLocaleLowerCase()] = Array.isArray(value)
          ? value
          : [value];
      }
    });

    return input;
  }

  protected static async extractResourceInput(
    res: Resource,
  ): Promise<PageTechFingerprint> {
    const input: PageTechFingerprint = {
      url: res.url,
      ...(await this.extractBodyData(res.body ?? '')),
    };

    input.headers = {};
    input.cookies = {};
    input.xhr = res.xhr;

    for (const [name, value] of Object.entries(res.headers ?? {})) {
      if (value === undefined) continue;
      input.headers[name.toLocaleLowerCase()] = Array.isArray(value)
        ? value
        : [value];
    }

    if (res.cookies) {
      for (const cookie of res.cookies) {
        input.cookies[cookie.name.toString().toLocaleLowerCase()] = [
          cookie.value.toString(),
        ];
      }
    } else {
      for (const [key, value] of Object.entries(res.headers)) {
        if (value !== undefined) {
          if (
            key.toLocaleLowerCase() === 'set-cookie' &&
            typeof value === 'string'
          ) {
            const cookies = parseCookie(value);
            for (const cookie of cookies) {
              input.cookies[cookie.name] = [cookie.value];
            }
          } else {
            input.headers[key.toLocaleLowerCase()] = Array.isArray(value)
              ? value
              : [value];
          }
        }
      }
    }

    return input;
  }

  static summarize(input: PageTechnology[]) {
    return input.map(tech => {
      return {
        name: tech.name,
        version: tech.version.length ? tech.version : undefined,
        categories: tech.categories.map(cat => cat.name),
      };
    });
  }

  static summarizeByCategory(input: PageTechnology[]) {
    const results: Record<string, string[]> = {};
    for (const tech of input) {
      const techName = `${tech.name}${tech.version ? ' ' + tech.version : ''}`;
      if (tech.categories.length) {
        for (const cat of tech.categories) {
          results[cat.name] ??= [];
          results[cat.name].push(techName);
        }
      } else {
        results['Other'] ??= [];
        results['Other'].push(techName);
      }
    }
    return results;
  }

  protected static wapifyDict(
    input: Record<string, undefined | string | string[]>,
  ) {
    const output: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        output[key.toLocaleLowerCase()] = Array.isArray(value)
          ? value
          : [value];
      }
    }
    return output;
  }
}
