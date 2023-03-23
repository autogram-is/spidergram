import {
  Spidergram,
  Resource,
  BrowserTools,
} from '../../index.js';
import is from '@sindresorhus/is';
import _ from 'lodash';
import { Fingerprint } from './fingerprint.js';
import {
  Technology as PageTechDefinition,
  Category as PageTechCategory,
  Input as PageTechFingerprint,
  Resolution as PageTechnology,
} from 'wappalyzer-core';

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
export interface PageTechOptions {
  /**
   * A dictionary of extracted values from the page used to identify the technologies it uses.
   * 
   */
  input?: PageTechFingerprint;
    
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


let fp: BrowserTools.Fingerprint | undefined;

async function getFingerPrinter(options: PageTechOptions = {}) {
  if (fp === undefined) {
    fp = new Fingerprint();
    await fp.loadDefinitions(options);
  }
  return fp;
}

/**
 * Extract the core content of an HTML page and return its plaintext, with
 * optional configuration options.
 */
export async function getPageTechnologies(
  input: string | cheerio.Root | Resource | Response,
  customOptions: PageTechOptions = {},
) {
  const options: PageTechOptions = _.defaultsDeep(
    customOptions,
    Spidergram.config.pageTechnologies,
  );
  const fp = await getFingerPrinter(options);
  const customSignals = options.input ?? {};

  // We do different work to get fingerprint data
  if (input instanceof Resource) {
    // An instantiated resource object
    return await fp
      .extractResourceInput(input)
      .then(signals => fp.analyze(signals));
  } else if (typeof input === 'string') {
    // A raw HTML string
    return await fp
      .extractBodyData(input)
      .then(signals => fp.analyze({ ...signals, ...customSignals }));
  } else if (is.function_(input)) {
    // A Cheerio root selector
    return await fp
      .extractBodyData(input.html())
      .then(signals => fp.analyze({ ...signals, ...customSignals }));
  } else {
    // A Fetch Response
    return await fp
      .extractResponseInput(input)
      .then(signals => fp.analyze({ ...signals, ...customSignals }));
  }
}

export function simplifyTechList(input: PageTechnology[]) {
  return input.map(tech => {
    return {
      name: tech.name,
      version: tech.version.length ? tech.version : undefined,
      categories: tech.categories.map(cat => cat.name),
    };
  })
}

export function groupTechByCategory(input: PageTechnology[]) {
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