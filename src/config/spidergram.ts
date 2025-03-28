import load, { Config, LoadOptions } from '@proload/core';
import json from '@proload/plugin-json';
import yaml from '@proload/plugin-yaml';
import typescript from '@proload/plugin-typescript';
import json5 from 'proload-plugin-json5';

import { ensureDir, exists } from 'fs-extra';

import { Configuration as CrawleeConfig } from 'crawlee';
import { Storage as FileStore } from 'typefs';
import { ParsedUrl, NormalizedUrl, UrlMutators } from '@autogram/url-tools';

import * as dotenv from 'dotenv';
import is from '@sindresorhus/is';
import _ from 'lodash';

import * as defaults from './defaults.js';
import {
  ArangoStore,
  Query,
  QueryFragments,
  QueryInput,
  ReportConfig,
  Resource,
} from '../index.js';
import { globalNormalizer } from './global-normalizer.js';
import { SpidergramConfig } from './spidergram-config.js';
import { setTimeout } from 'timers/promises';
import { readPackageUpSync } from 'read-pkg-up';

export class SpidergramError extends Error {}

export class Spidergram<T extends SpidergramConfig = SpidergramConfig> {
  protected static _instance?: Spidergram;

  static get config() {
    return Spidergram._instance?.config ?? Spidergram.defaults;
  }

  static get status() {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(entry =>
        entry[0].startsWith('SPIDERGRAM_'),
      ),
    );

    return {
      instantiated: Spidergram._instance !== undefined,
      initializing: Spidergram._instance?._initializing,
      initialized: !Spidergram._instance?._needsInit,
      loaded: !Spidergram._instance?._needsLoad,
      configFile: Spidergram._instance?.configFile,
      arango: Spidergram._instance?._arango !== undefined,
      env,
    };
  }

  static get defaults(): SpidergramConfig {
    return defaults.spidergramDefaults;
  }

  /**
   * Initializes a copy of Spidergram
   */
  static async load<T extends SpidergramConfig = SpidergramConfig>(
    filePath?: string,
    reset = false,
  ) {
    if (Spidergram._instance === undefined) {
      return new Spidergram<T>().init(filePath);
    } else if (reset) {
      return Spidergram._instance.init(filePath);
    } else {
      if (Spidergram._instance._initializing) {
        while (Spidergram._instance._initializing) {
          // Sometimes, our promises can collide and an incompletely initialized
          // instance can be requested. This pauses for a relatively teeny 50ms.,
          // which is generally plenty of time for the initialization process to
          // finish.
          await setTimeout(50);
        }
      }
      return Promise.resolve(Spidergram._instance);
    }
  }

  protected async init(filePath?: string) {
    this._initializing = true;
    await this.loadConfigFile(filePath);

    // A very weird special case. This would be nice to generalize when we replace the
    // Object serializer and persistence code.
    Resource.offloadBodyHtml = this.config.offloadBodyHtml;

    // Shared Arango connection. In the future we may instantiate custom Entities, build
    // indexes, and so on here.
    await this.attemptArangoConnection(true);

    // Set up file storage defaults
    if (this.config.typefs) {
      FileStore.config = this.config.typefs;
    } else {
      if (this.config.storageDirectory && this.config.outputDirectory) {
        await ensureDir(this.config.storageDirectory);
        await ensureDir(this.config.outputDirectory);

        FileStore.config = {
          default: 'storage',
          disks: {
            storage: {
              driver: 'file',
              root: this.config.storageDirectory,
              jail: true,
            },
            output: {
              driver: 'file',
              root: this.config.outputDirectory,
              jail: true,
            },
          },
        };
      }
    }

    // Crawlee configuration; in the future
    if (this.config.crawlee instanceof CrawleeConfig) {
      this._crawleeConfig = this.config.crawlee;
    } else {
      this._crawleeConfig = new CrawleeConfig(this.config.crawlee);
      this.crawlee.set('logLevel', this.config.logLevel);
    }

    // Global URL normalizer
    if (is.function(this.config.normalizer)) {
      this.setNormalizer(this.config.normalizer);
    } else if (is.plainObject(this.config.normalizer)) {
      this.setNormalizer((url: ParsedUrl) =>
        globalNormalizer(url, { ...this.config.normalizer }),
      );
    }

    // Give config scripts a chance to modify things
    if (this._loadedConfig?.value.finalizer) {
      await this._loadedConfig?.value.finalizer(this);
    }

    this._initializing = false;
    this._needsInit = false;
    return Promise.resolve(this);
  }

  protected async loadConfigFile(filePath?: string) {
    if (filePath && !(await exists(filePath))) {
      throw new SpidergramError(`Config file ${filePath} doesn't exist`);
    }

    load.use([typescript, json5, json, yaml]);
    const options: LoadOptions<T> = {
      context: this,
      mustExist: false,
      filePath: filePath,
    };

    // Reset the active configuration to the baseline defaults, load any user-defined
    // configuration, and merge them.
    this._activeConfig = Spidergram.defaults as T;
    this._loadedConfig = await load('spidergram', options);

    this._activeConfig = _.defaultsDeep(
      this._loadedConfig?.value,
      this._activeConfig,
    );

    // These are dropped in after config is loaded, so we can avoid
    // overwriting custom queries with our defaults. Long term we need to
    // distinguish between 'properties that should be deep-merged',
    // 'properties that should be overwritten,' and the stuff in between.
    this.buildDefaultQueries();
    this.buildDefaultReports();

    // Ensure empty defaults exist, if necessary
    this._activeConfig.arango ??= {};

    // Load environment variables, overriding any existing configuration defaults.
    dotenv.config({ override: true });

    if (process.env.SPIDERGRAM_DEBUG)
      this._activeConfig.debug = !!process.env.SPIDERGRAM_DEBUG;
    if (process.env.SPIDERGRAM_LOG_LEVEL)
      this._activeConfig.logLevel = process.env.SPIDERGRAM_LOG_LEVEL;
    if (process.env.SPIDERGRAM_STORAGE_DIRECTORY)
      this._activeConfig.storageDirectory = process.env.SPIDERGRAM_STORAGE_DIR;
    if (process.env.SPIDERGRAM_OUTPUT_DIRECTORY)
      this._activeConfig.outputDirectory =
        process.env.SPIDERGRAM_OUTPUT_DIRECTORY;
    if (process.env.SPIDERGRAM_ARANGO_DBNAME)
      this._activeConfig.arango.databaseName =
        process.env.SPIDERGRAM_ARANGO_DBNAME;
    if (process.env.SPIDERGRAM_ARANGO_URL)
      this._activeConfig.arango.url = process.env.SPIDERGRAM_ARANGO_URL;
    if (process.env.SPIDERGRAM_ARANGO_USERNAME)
      this._activeConfig.arango.auth = {
        username: process.env.SPIDERGRAM_ARANGO_USERNAME,
        password: process.env.SPIDERGRAM_ARANGO_PASSWORD,
      };

    this._needsLoad = false;
    return Promise.resolve();
  }

  protected _needsInit = true;
  protected _initializing = false;
  protected _needsLoad = true;
  protected _loadedConfig?: Config<T>;
  protected _activeConfig: T;

  protected _arango?: ArangoStore;
  protected _crawleeConfig?: CrawleeConfig;
  protected _normalizer?: UrlMutators.UrlMutator;
  protected _version?: string;

  protected constructor() {
    Spidergram._instance = this;
    this._activeConfig = Spidergram.defaults as T;
  }

  get config(): T {
    return this._activeConfig;
  }

  get configFile() {
    return this._loadedConfig?.filePath;
  }

  get rawConfig() {
    return this._loadedConfig?.raw ?? {};
  }

  setNormalizer(input: UrlMutators.UrlMutator) {
    NormalizedUrl.normalizer = input;
  }

  get normalizer() {
    return NormalizedUrl.normalizer;
  }

  get version() {
    if (!this._version) {
      this._version = readPackageUpSync()?.packageJson?.version;
    }
    return this._version;
  }

  /**
   * This is here so that custom config scripts can quickly reuse the
   * default normalizer with a few customizations — in addition to their
   * own more nuanced logic.
   */
  get globalNormalizer() {
    return globalNormalizer;
  }

  setArangoStore(input: ArangoStore) {
    this._arango = input;
  }

  async attemptArangoConnection(silent = false): Promise<Error | ArangoStore> {
    if (this._arango === undefined) {
      try {
        await ArangoStore.open(
          this.config.arango?.databaseName,
          this.config.arango,
        ).then(ast => this.setArangoStore(ast));
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (!silent || this.config.debug) throw err;
          return Promise.resolve(err);
        }
      }
    }
    return Promise.resolve(this.arango);
  }

  get hasArangoConnection() {
    return this._arango !== undefined;
  }

  get arango() {
    if (this._arango === undefined) {
      throw new SpidergramError('No connection to ArangoDB');
    } else {
      return this._arango;
    }
  }

  files(bucket?: string) {
    try {
      return FileStore.disk(bucket);
    } catch (err: unknown) {
      return FileStore.disk();
    }
    return FileStore.disk(bucket);
  }

  setCrawleeConfig(input: CrawleeConfig) {
    this._crawleeConfig = input;
  }

  get crawlee() {
    return CrawleeConfig.getGlobalConfig();
  }

  buildDefaultReports() {
    const reports: Record<string, ReportConfig> = {
      default: {
        name: 'Spidergram Report',
        group: 'builtin',
        description: 'Summary of pages, downloadable media, and errors',
        settings: {
          type: 'xlsx',
        },
        queries: {
          Overview: 'summary',
          'Crawled Pages': 'pages',
          Downloads: 'media',
          Errors: 'errors',
        },
      },
    };

    this._activeConfig.reports ??= {};
    this._activeConfig.reports = {
      ...reports,
      ...this._activeConfig.reports,
    };
  }

  buildDefaultQueries() {
    const queries: Record<string, QueryInput> = {
      summary: new Query(QueryFragments.pages_crawled)
        .category('builtin')
        .description('Overview of crawled pages')
        .collect('site', 'parsed.hostname')
        .collect('content', 'mime')
        .collect('status', 'code')
        .sortBy('site', 'asc'),

      pages: new Query(QueryFragments.pages_linked)
        .category('builtin')
        .description('Successfully crawled HTML pages')
        .filterBy('code', 200)
        .filterBy('mime', 'text/html')
        .sortBy('url', 'asc')
        .return('site', 'parsed.hostname')
        .return('path', 'parsed.pathname')
        .return('title', 'data.title')
        .return('words', 'content.readability.words')
        .return({
          document: false,
          name: 'Inlinks',
          path: 'inlinks',
          function: 'length',
        })
        .return({
          document: false,
          name: 'Outlinks',
          path: 'outlinks',
          function: 'length',
        }),

      media: new Query(QueryFragments.pages_linked)
        .category('builtin')
        .description('Successfully crawled non-HTML content')
        .filterBy('code', 200)
        .filterBy({ path: 'mime', eq: 'text/html', negate: true })
        .sortBy('url', 'asc')
        .return('site', 'parsed.hostname')
        .return('path', 'parsed.pathname')
        .return('type', 'mime')
        .return('size', 'size')
        .return({
          document: false,
          name: 'Inlinks',
          path: 'inlinks',
          function: 'length',
        }),

      errors: new Query(QueryFragments.pages_linked)
        .category('builtin')
        .description('Errors encountered while crawling')
        .filterBy({ path: 'code', eq: 200, negate: true })
        .sortBy({
          document: false,
          path: 'inlinks',
          function: 'length',
          direction: 'desc',
        })
        .return('site', 'parsed.hostname')
        .return('path', 'parsed.pathname')
        .return('status', 'code')
        .return('message', 'message')
        .return({
          document: false,
          name: 'Inlinks',
          path: 'inlinks',
          function: 'length',
        }),

      network: new Query({
        metadata: {
          category: 'builtin',
          description: 'Inter-site link counts',
        },
        collection: 'resources',
        subqueries: [
          { collection: 'links_to', document: 'lt' },
          { collection: 'responds_with', document: 'rw' },
          { collection: 'resources', document: 'target' },
        ],
        filters: [
          { path: '_id', join: 'lt._from' },
          { document: 'lt', path: '_to', join: 'rw._from' },
          { document: 'rw', path: '_to', join: 'target._id' },
          {
            path: 'parsed.hostname',
            eq: 'target.parsed.hostname',
            negate: true,
            value: 'dynamic',
          },
        ],
        aggregates: [
          { name: 'source', path: 'parsed.hostname', function: 'collect' },
          {
            name: 'destination',
            document: 'target',
            path: 'parsed.hostname',
            function: 'collect',
          },
        ],
        count: 'strength',
      }),
    };

    this._activeConfig.queries ??= {};
    this._activeConfig.queries = {
      ...queries,
      ...this._activeConfig.queries,
    };
  }
}
