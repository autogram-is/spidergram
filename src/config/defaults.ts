/**
 * These exported constants contain default values for Spidergram classes and
 * functions that accept complex options or configuration. Classes relying on
 * these defaults should access them via the {@link Spidergram} singleton
 * class; it handles overriding them with any user-supplied defaults, and handles
 * the complex logic of overriding the provided defaults with environment vars
 * when appropriate.
 */

import path from 'path';
import { NormalizerOptions, SpidergramConfig } from './index.js';
import { mimeGroups } from '../spider/helpers/mime.js';
import { EnqueueUrlOptions, SpiderOptions } from '../spider/index.js';
import { UrlMatchStrategy } from '../tools/urls/index.js';
import {
  PageDataOptions,
  PageContentOptions,
  HtmlToTextOptions,
} from '../tools/html/index.js';
import { TechAuditOptions } from '../tools/browser/index.js';
import { readPackageUpSync } from 'read-pkg-up';
import { PageAnalysisOptions } from '../tools/graph/analyze-page.js';
import { ReportConfig } from '../reports/report-types.js';

export const defaultReports: Record<string, ReportConfig> = {
  default: {
    name: 'Spidergram Report',
    group: 'builtin',
    description: 'Summary of pages, downloadable media, and errors',
    settings: {
      type: 'xlsx'
    },
    queries: {
      'Overview': 'summary',
      'Crawled Pages': 'pages',
      'Downloads': 'media',
      'Errors': 'errors'
    }
  }
}

export const urlNormalizerDefaults: NormalizerOptions = {
  forceProtocol: 'https:',
  forceLowercase: 'href',
  discardFirstSegment: 'ww[w0-9]*',
  discardAnchor: true,
  discardAuth: true,
  discardIndex: '**/{index,default}.{htm,html,aspx,php}',
  discardSearch: '!{page,p}',
  sortSearchParams: true,
};

export const urlDiscoveryDefaults: EnqueueUrlOptions = {
  save: true,
  crawl: UrlMatchStrategy.SameDomain,
  discardEmpty: true,
  discardlocalAnchors: true,
  discardNonWeb: false,
  discardUnparsable: false,
  discardExisting: true,
};

// See https://github.com/html-to-text/node-html-to-text/blob/master/packages/html-to-text/README.md#predefined-formatters
// for additional tricks.
export const htmlToTextDefaults: HtmlToTextOptions = {
  wordwrap: false,
  selectors: [
    { selector: 'img', format: 'skip' },
    { selector: 'a', options: { ignoreHref: true } },
  ],
};

export const spiderDefaults: Partial<SpiderOptions> = {
  logLevel: 0,
  preNavigationHooks: [],
  postNavigationHooks: [],
  pageHandler: undefined,
  requestHandlers: {},
  saveCookies: false,
  savePerformance: false,
  saveXhrList: false,
  urls: urlDiscoveryDefaults,
  parseMimeTypes: mimeGroups.page,
  downloadMimeTypes: [],
  userAgent: `Spidergram ${readPackageUpSync()?.packageJson?.version}`,
  handlerTimeout: 180,
};

export const pageDataDefaults: PageDataOptions = {
  attributes: true,
  head: true,
  meta: true,
  links: false,
  noscript: false,
  scripts: false,
  json: true,
  schemaOrg: true,
  styles: false,
  templates: false,
};

export const pageTechnologyDefaults: TechAuditOptions = {
  forceReload: false,
  technologiesUrl:
    'https://raw.githubusercontent.com/wappalyzer/wappalyzer/master/src/technologies',
  categoriesUrl:
    'https://raw.githubusercontent.com/wappalyzer/wappalyzer/master/src/categories.json',
  technologies: {},
  categories: {},
};

export const pageContentDefaults: PageContentOptions = {
  readability: true,
  allowMultipleContentElements: false,
  defaultToFullDocument: true,
  trim: true,
};

export const arangoDefaults = {
  databaseName: 'spidergram',
  url: 'http://127.0.0.1:8529',
  auth: {
    username: 'root',
    password: '',
  },
};

export const analyzePageDefaults: PageAnalysisOptions = {
  data: true,
  content: true,
  tech: true,
  links: false,
  site: 'parsed.hostname',
  properties: {},
  patterns: []
};

export const spidergramDefaults: SpidergramConfig = {
  debug: false,
  logLevel: 'error',
  storageDirectory: path.join(process.cwd(), 'storage'),
  outputDirectory: path.join(process.cwd(), 'output'),
  arango: arangoDefaults,
  spider: spiderDefaults,
  htmlToText: htmlToTextDefaults,
  queries: {},
  reports: defaultReports,
  analysis: analyzePageDefaults,
  pageData: pageDataDefaults,
  pageContent: pageContentDefaults,
  pageTechnologies: pageTechnologyDefaults,
  normalizer: urlNormalizerDefaults,
};
