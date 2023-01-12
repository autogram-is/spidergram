import _ from "lodash";

import { parseWithCheerio } from "./parse-with-cheerio.js";
import { parseElementsToArray, parseElementsToDictionary } from './parse-elements.js';
import { parseMetatags, MetaValues } from "./parse-meta.js";
import { getBodyAttributes } from "./get-body-attributes.js";

export type ParseOptions = {
  attributes?: boolean,
  head?:  boolean,
  meta?: boolean,
  links?: boolean,
  noscript?: boolean,
  scripts?: boolean,
  styles?: boolean,
  templates?: boolean,
  silent?: boolean,
}

export const parseOptionDefaults = {
  attributes: true,
  head: true,
  meta: true,
  links: true,
  noscript: true,
  scripts: true,
  styles: true,
  templates: true,
  silent: false,
} 

/**
 * Structured data parsed from an HTML document.
 * 
 * This function makes a best attempt to return accurate and complete data that's
 * actually easy to retrieve in code, without rewriting a parser. Nobody wants that.
 */
export interface ParsedResults {
  [key: string]: unknown;

  /**
   * If the perser options include the 'silent' mode flag and an error occurs during parsing,
   * its message will be included in this return property rather than a thrown error.
   */
  error?: string,

  attributes?: Record<string, string | string[] | undefined>;
  title?: string,
  base?: string,
  baseTarget?: string,
  meta?: MetaValues,
  links?: Record<string, Record<string, string | undefined>[]>,
  templates?: Record<string, string | undefined>[],
  scripts?: Record<string, string | undefined>[],
  json?: Record<string, unknown>[],
  styles?: Record<string, string | undefined>[],
  noscript?: Record<string, string | undefined>[],
}

export function getMetadata(input: string | cheerio.Root, customOptions: ParseOptions = {}): ParsedResults {
  const $ = typeof input === 'string' ? parseWithCheerio(input) : input;
  const results: ParsedResults = { };
  const options = _.defaultsDeep(customOptions, parseOptionDefaults);
  
  if (options.attributes) {
    const attributes = getBodyAttributes($);
    if (Object.entries(attributes).length) {
      results.attributes ??= {};
      results.attributes = attributes;
    }
  }

  if (options.head) {
    const title = $('title').first().html()?.toString().trim() ?? undefined;
    if (title) {
      results.title = title;
    }

    const base = $('base').first().attr('href')?.toString().trim() ?? undefined;
    if (base) {
      results.base = base;
    }

    const baseTarget = $('base').first().attr('target')?.toString().trim() ?? undefined;
    if (baseTarget) {
      results.baseTarget = baseTarget;
    }
  }

  if (options.meta) {
    const headMeta = $('meta').toArray().map(element => $(element).attr());
    if (Object.entries(headMeta).length) {
      results.meta = parseMetatags(headMeta);
    }
  }

  if (options.links) {
    const links = parseElementsToDictionary($, 'link', 'rel');
    if (links) {
      results.links = links;
    }
  }

  if (options.noscript) {
    const noscript = parseElementsToArray($, 'noscript');
    if (noscript.length) {
      results.noscript = noscript;
    }
  }

  if (options.templates) {
    const templates = parseElementsToArray($, 'template');
    if (templates.length) {
      results.templates = templates;
    }
  }

  if (options.styles) {
    const styles = parseElementsToArray($, 'style');
    if (styles.length) {
      results.styles = styles;
    }
  }

  if (options.scripts) {
    const json: Record<string, string | unknown>[] = [];
    const scripts: Record<string, string | undefined>[] = [];

    parseElementsToArray($, 'script').forEach( script => {
      if (script.type?.includes('json') && typeof script.content === 'string') {
        script.content = JSON.parse(script.content);
        json.push(script);
      }
      else (scripts.push(script));
    })
    if (scripts.length) {
      results.scripts = scripts;
    }
    if (json.length) {
      results.json = json;
    }
  }

  return results;
}