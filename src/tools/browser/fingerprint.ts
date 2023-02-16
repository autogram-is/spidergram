import type {
  Technology as FingerprintTechnology,
  Category as FingerprintCategory,
  Input as FingerprintInput,
  Resolution as FingerprintResult,
} from 'wappalyzer-core';
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
  protected constructor() {
    throw new Error('wtf bro');
  }

  protected static loaded = false;

  static analyzeHtml(
    html: string,
    technologies?: FingerprintTechnology[],
  ): FingerprintResult[] {
    const input = Fingerprint.extractBodyData(html);
    return Fingerprint.analyze(input, technologies);
  }

  static analyzeResource(
    resource: Resource,
    technologies?: FingerprintTechnology[],
  ): FingerprintResult[] {
    const input: FingerprintInput = {
      url: resource.url,
      ...Fingerprint.extractBodyData(resource.body ?? ''),
    };
    return Fingerprint.analyze(input, technologies);
  }

  static analyze(
    input: FingerprintInput,
    technologies?: FingerprintTechnology[],
  ): FingerprintResult[] {
    return resolve(analyze(input, technologies));
  }

  static async loadDefinitions(
    options: FingerprintOptions = {},
  ): Promise<void> {
    const project = await Project.config();

    if (!Fingerprint.loaded || options.forceReload) {
      let categories: Record<string, FingerprintCategory> = {};
      let technology: Record<string, FingerprintTechnology> = {};

      const catExists = await project
        .files('config')
        .exists('wappalyzer-categories.json');
      const techExists = await project
        .files('config')
        .exists('wappalyzer-technologies.json');

      if (!catExists || options.ignoreCache)
        await Fingerprint.cacheCategories();
      if (!techExists || options.ignoreCache)
        await Fingerprint.cacheTechnologies();

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

      Fingerprint.loaded = true;
    }

    return Promise.resolve();
  }

  protected static async cacheTechnologies() {
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

  protected static async cacheCategories() {
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

  static coerceDictionary(
    input: Record<string, string | string[] | undefined>,
  ) {
    const output: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(input)) {
      if (typeof v === 'string') output[k.toLocaleLowerCase()] = [v];
      else if (Array.isArray(v)) output[k.toLocaleLowerCase()] = v;
    }
    return output;
  }

  static extractBodyData(html: string) {
    const data = HtmlTools.getPageData(html, { all: true });
    const input: FingerprintInput = { html: html };

    input.meta = data.meta
      ? Fingerprint.coerceDictionary(data.meta)
      : undefined;
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
}
