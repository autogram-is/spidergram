import type {
  Technology as FingerprintTechnology,
  Category as FingerprintCategory,
  Input as FingerprintInput,
  Resolution as FingerprintResult,
} from 'wappalyzer-core';
import { parse as parseCookie } from 'set-cookie-parser';
import pkg from 'wappalyzer-core';
const { analyze, resolve, setCategories, setTechnologies } = pkg;

import { Project, Resource } from '../../index.js';
import { HtmlTools } from '../../index.js';

export type {
  Technology as FingerprintTechnology,
  Category as FingerprintCategory,
  Input as FingerprintInput,
  Resolution as FingerprintResult,
} from 'wappalyzer-core';

export type FingerprintOptions = {
  technologies?: Record<string, FingerprintTechnology>;
  categories?: Record<string, FingerprintCategory>;
  forceReload?: boolean;
  ignoreCache?: boolean;
};

export class Fingerprint {
  protected loaded = false;

  async analyze(
    input: string | Response | Resource | FingerprintInput,
    technologies?: FingerprintTechnology[],
  ): Promise<FingerprintResult[]> {
    let inputStruct: FingerprintInput = {};

    if (typeof input === 'string') {
      inputStruct = await this.extractBodyData(input);
    } else if (input instanceof Resource) {
      inputStruct = await this.extractResourceInput(input);
    } else if (input instanceof Response) {
      inputStruct = await this.extractResponseInput(input);
    } else {
      inputStruct = input;
    }

    return resolve(analyze(inputStruct, technologies));
  }

  async loadDefinitions(options: FingerprintOptions = {}): Promise<this> {
    const project = await Project.config();

    if (!this.loaded || options.forceReload) {
      let categories: Record<string, FingerprintCategory> = {};
      let technology: Record<string, FingerprintTechnology> = {};

      const catExists = await project
        .files('config')
        .exists('wappalyzer-categories.json');
      const techExists = await project
        .files('config')
        .exists('wappalyzer-technologies.json');

      if (!catExists || options.ignoreCache) await this.cacheCategories();
      if (!techExists || options.ignoreCache) await this.cacheTechnologies();

      if (await project.files('config').exists('wappalyzer-categories.json')) {
        const json = (
          await project.files('config').read('wappalyzer-categories.json')
        ).toString();
        categories = JSON.parse(json) as Record<string, FingerprintCategory>;
      }

      if (
        await project.files('config').exists('wappalyzer-technologies.json')
      ) {
        const json = (
          await project.files('config').read('wappalyzer-technologies.json')
        ).toString();
        technology = JSON.parse(json) as Record<string, FingerprintTechnology>;
      }

      setCategories({ ...categories, ...options.categories });
      setTechnologies({ ...technology, ...options.technologies });

      this.loaded = true;
    }

    return Promise.resolve(this);
  }

  protected async cacheTechnologies() {
    const project = await Project.config();

    const chars = Array.from({ length: 27 }, (value, index) =>
      index ? String.fromCharCode(index + 96) : '_',
    );

    const data = await Promise.all(
      chars.map(async char => {
        const url = new URL(
          `https://raw.githubusercontent.com/wappalyzer/wappalyzer/master/src/technologies/${char}.json`,
        );
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
      .files('config')
      .write(
        'wappalyzer-technologies.json',
        Buffer.from(JSON.stringify(technologies)),
      );
  }

  protected async cacheCategories() {
    const project = await Project.config();

    const url = new URL(
      'https://raw.githubusercontent.com/wappalyzer/wappalyzer/master/src/categories.json',
    );
    const categories = await fetch(url).then(response => response.json());
    return project
      .files('config')
      .write(
        'wappalyzer-categories.json',
        Buffer.from(JSON.stringify(categories)),
      );
  }

  async extractBodyData(html: string): Promise<FingerprintInput> {
    const data = await HtmlTools.getPageData(html, { all: true });

    const input: FingerprintInput = {
      html,
      meta: wapifyDict(data.meta ?? {}),
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

  async extractResponseInput(res: Response): Promise<FingerprintInput> {
    const input: FingerprintInput = {
      url: res.url,
      ...this.extractBodyData(await res.text()),
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

  async extractResourceInput(res: Resource): Promise<FingerprintInput> {
    const input: FingerprintInput = {
      url: res.url,
      ...this.extractBodyData(res.body ?? ''),
    };

    input.headers = {};
    input.cookies = {};

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

    return input;
  }
}

function wapifyDict(input: Record<string, undefined | string | string[]>) {
  const output: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key.toLocaleLowerCase()] = Array.isArray(value) ? value : [value];
    }
  }
  return output;
}
