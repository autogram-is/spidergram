import load, { Config, LoadOptions } from '@proload/core';
import json from '@proload/plugin-json';
import typescript from '@proload/plugin-typescript';

import { ensureDir, exists } from 'fs-extra';

import { Logger, Filter, Human } from 'caterpillar';
import { Configuration as CrawleeConfig } from 'crawlee';
import { Storage as FileStore } from 'typefs';
import { ParsedUrl, NormalizedUrl, UrlMutators } from '@autogram/url-tools';

import * as dotenv from 'dotenv';
import is from '@sindresorhus/is';
import _ from 'lodash';

import * as defaults from './defaults.js';
import { ArangoStore } from '../index.js';
import { globalNormalizer } from './global-normalizer.js';
import { SpidergramConfig } from './spidergram-config.js';

export class SpidergramError extends Error {}

export class Spidergram<T extends SpidergramConfig = SpidergramConfig> {
  protected static _instance: Spidergram;

  static get config() {
    return this._instance?.config ?? Spidergram.defaults;
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
    if (this._instance === undefined || reset) {
      this._instance = new Spidergram<T>();
      await this._instance.init(filePath);
    }
    return Promise.resolve(this._instance);
  }

  protected async init(filePath?: string) {
    await this.loadConfigFile(filePath);

    // Shared Arango connection. In the future we may instantiate custom Entities, build
    // indexes, and so on here.
    this._arango = await ArangoStore.open(
      this.config.arango?.databaseName,
      this.config.arango,
    );

    // Centralized logging; also pipes logs to stderr unless logLevel is FALSE.
    this._log = new Logger({
      defaultLevel: this.config.logLevel ? this.config.logLevel : undefined,
    });
    if (this.config.logLevel) {
      // consider logging to Arango as well
      this._log
        .pipe(
          new Filter({
            filterLevel:
              this._log.getLogLevel(this.config.logLevel)?.levelNumber ?? 0,
          }),
        )
        .pipe(new Human({ color: true }))
        .pipe(process.stderr);
    }

    // Set up file storage defaults
    if (this.config.typefs) {
      FileStore.config = this.config.typefs;
    } else {
      if (this.config.storageDirectory) {
        await ensureDir(this.config.storageDirectory);
        FileStore.config = {
          default: 'local',
          disks: {
            local: {
              driver: 'file',
              root: this.config.storageDirectory,
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
      this.crawlee.set(
        'logLevel',
        this._log.getLogLevel(this.config.logLevel ? this.config.logLevel : 0)
          ?.levelNumber ?? 0,
      );
      // TODO: Implement Arango Storage Client for Crawlee
      // this._crawleeConfig.useStorageClient(arangoStorageClient)
    }

    // Global URL normalizer
    if (is.function_(this.config.urlNormalizer)) {
      this.setNormalizer(this.config.urlNormalizer);
    } else if (is.plainObject(this.config.urlNormalizer)) {
      this.setNormalizer((url: ParsedUrl) =>
        globalNormalizer(url, { ...this.config.urlNormalizer }),
      );
    }

    // Give config scripts a chance to modify things
    if (this._loadedConfig?.value.init) {
      await this._loadedConfig?.value.init(this);
    }

    // Set everything up based on the config values
    return Promise.resolve(this);
  }

  protected async loadConfigFile(filePath?: string) {
    if (filePath && !(await exists(filePath))) {
      throw new SpidergramError(`Config file ${filePath} doesn't exist`);
    }

    load.use([typescript, json]);
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

    return Promise.resolve();
  }

  protected _loadedConfig: Config<T> | undefined;
  protected _activeConfig: T;

  protected _log: Logger | undefined;
  protected _arango: ArangoStore | undefined;
  protected _crawleeConfig: CrawleeConfig | undefined;
  protected _normalizer: UrlMutators.UrlMutator | undefined;

  protected constructor() {
    this._activeConfig = Spidergram.defaults as T;
    Spidergram._instance = this;
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

  setArangoStore(input: ArangoStore) {
    this._arango = input;
  }

  get arango() {
    if (this._arango === undefined) {
      throw new SpidergramError('No connection to ArangoDB');
    } else {
      return this._arango;
    }
  }

  get files() {
    return FileStore.disk.bind(FileStore);
  }

  get log() {
    return this._log;
  }

  setCrawleeConfig(input: CrawleeConfig) {
    this._crawleeConfig = input;
  }

  get crawlee() {
    return CrawleeConfig.getGlobalConfig();
  }
}
