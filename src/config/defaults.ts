/**
 * These exported constants contain default values for Spidergram classes and
 * functions that accept complex options or configuration. Classes relying on 
 * these defaults should access them via the {@link Spidergram} singleton
 * class; it handles overriding them with any user-supplied defaults, and handles
 * the complex logic of overriding the provided defaults with environment vars
 * when appropriate.
 */

import path from 'path';
import { NormalizerOptions, SpidergramConfig } from "./index.js";
import { mimeGroups } from '../spider/helpers/mime.js';
import { UrlMatchStrategy, EnqueueUrlOptions, SpiderOptions } from '../spider/index.js';
import { PageContentOptions } from '../tools/html/get-page-content.js';
import { PageDataOptions } from '../tools/html/get-page-data.js';
import { readPackageUpSync } from 'read-pkg-up';

export const urlNormalizerDefaults: NormalizerOptions = {
  forceProtocol: 'https:',
  forceLowercase: 'host',
  discardSubdomain: 'ww*',
  discardAnchor: true,
  discardAuth: true,
  discardIndex: '**/{index,default}.{htm,html,aspx,php}',
  discardSearch: '!{page,p}',
  discardTrailingSlash: false,
  sortSearchParams: true,
};

export const urlDiscoveryDefaults: EnqueueUrlOptions = {
  limit: Number.POSITIVE_INFINITY,
  selector: 'body a',
  save: UrlMatchStrategy.All,
  enqueue: UrlMatchStrategy.SameDomain,
  prioritize: false,
  checkRobots: false,
  respectRobots: false,
  checkSitemaps: false,
  prioritizeSitemaps: false,
  discardEmptyLinks: true,
  discardAnchorOnlyLinks: true,
  discardNonWebLinks: false,
  discardUnparsableLinks: false,
  discardExistingLinks: true,
};

export const spiderDefaults: Partial<SpiderOptions> = {
  preNavigationHooks: [],
  postNavigationHooks: [],
  pageHandler: undefined,
  requestHandlers: {},
  urlOptions: urlDiscoveryDefaults,
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
  styles: false,
  templates: false,
};

export const pageContentDefaults: PageContentOptions = {
  readability: true,
  allowMultipleContentElements: false,
  defaultToFullDocument: true,
  trim: true,
};

export const spidergramDefaults: SpidergramConfig = {
  debug: false,
  logLevel: 'error',
  storageDirectory: path.join(process.cwd(), 'storage'),
  arango: { databaseName: 'spidergram' },
  crawlee: {},
  spider: spiderDefaults,
  htmlToText: {},
  queries: {},
  reports: {},
  pageData: pageDataDefaults,
  pageContent: pageContentDefaults,
  urlNormalizer: urlNormalizerDefaults,
};
