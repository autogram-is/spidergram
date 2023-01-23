import _ from "lodash";

import { Resource } from "../../model/index.js";
import { getCheerio } from "./get-cheerio.js";
import { parseElementsToArray, parseElementsToDictionary } from './parse-elements.js';
import { parseMetaTags, MetaValues } from "./parse-meta-tags.js";
import { findElementData, ElementData } from "./find-element-data.js";

/**
 * Options to control extraction of structured data from HTML pages
 */
type PageDataOptions = {
  /**
   * Parse all available information, ignoring any other 'false' parameters set in
   * the options object.
   */
  all?: boolean,
  /**
   * Parse and list the attributes of the HTML `<body>` tag. Body classes and IDs are
   * often populated with contextual and content related metadata by CMSs templates.
   */
  attributes?: boolean,
  /**
   * Extract common HTML head sub-tags like `<title>`, `<base>`, and so on.
   */
  head?:  boolean,
  /**
   * Parse and list any `<meta>` tags present in the document. These will be returned
   * as a dictionary keyed by the 'name', 'itemprop', and 'property' attributes of the
   * meta tags; keys with colons will be treated as nested; `<meta name="og:title" ...>`
   * for example will become become `meta['og']['title'] = ...`
   */
  meta?: boolean,
  /**
   * Parse and list any `<link>` tags present in the document. These will be returned
   * as a dictionary keyed by the links' `rel` attributes.
   */
  links?: boolean,
  /**
   * Parse and list any `<noscript>` tags present in the document.
   */
  noscript?: boolean,
  /**
   * Parse and list any `<script>` tags in the document; JSON data will be parsed
   * and stored in a separate 'json' property of the results
   */
  scripts?: boolean,
  /**
   * Parse and list any CSS `<style>` tags present in the document.
   */
  styles?: boolean,
  /**
   * Parse and list any HTML `<template>` tags present in the document.
   */
  templates?: boolean,
  /**
   * Ignore rather than modifying tags and structured data that are present but
   * incomplete or in the wrong location. Turning on 'strict' mode will throw away
   * quite a bit of data, because everyone on the planet outputs horribly malformed
   * meta tags, RDFa gunk, and so on. It's a plague. Nightmarish stuff, really.
   */
  strict?: boolean,
  metaArrayAttributes?: string[],
}

export const defaults = {
  attributes: true,
  head: true,
  meta: true,
  links: false,
  noscript: false,
  scripts: false,
  styles: false,
  templates: false,
} 

/**
 * Structured data parsed from an HTML document.
 * 
 * This function makes a best attempt to return accurate and complete data that's
 * actually easy to retrieve in code, without rewriting a parser. Nobody wants that.
 */
export interface PageData {
  [key: string]: unknown;
  attributes?: ElementData;
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

export function getPageData(input: string | cheerio.Root | Resource, customOptions: PageDataOptions = {}): PageData {
  const $ = getCheerio(input);
  const results: PageData = { };
  const options = _.defaultsDeep(customOptions, defaults);
  
  if (options.attributes || options.all) {
    const attributes = findElementData($('body'));
    if (Object.entries(attributes).length) {
      results.attributes = attributes;
    }
  }

  if (options.head || options.all) {
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

  if (options.meta || options.all) {
    const headMeta = $('meta').toArray().map(element => $(element).attr());
    if (Object.entries(headMeta).length) {
      results.meta = parseMetaTags(headMeta);
    }
  }

  if (options.links || options.all) {
    const links = parseElementsToDictionary($, 'link', 'rel');
    if (links) {
      results.links = links;
    }
  }

  if (options.noscript || options.all) {
    const noscript = parseElementsToArray($, 'noscript');
    if (noscript.length) {
      results.noscript = noscript;
    }
  }

  if (options.templates || options.all) {
    const templates = parseElementsToArray($, 'template');
    if (templates.length) {
      results.templates = templates;
    }
  }

  if (options.styles || options.all) {
    const styles = parseElementsToArray($, 'style');
    if (styles.length) {
      results.styles = styles;
    }
  }

  if (options.scripts || options.all) {
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