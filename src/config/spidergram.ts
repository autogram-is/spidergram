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
import { setTimeout } from 'timers/promises';
import { SpiderCli } from '../cli/shared/index.js';

export class SpidergramError extends Error {}

export class Spidergram<T extends SpidergramConfig = SpidergramConfig> {
  protected static _instance?: Spidergram;

  static get config() {
    return Spidergram._instance?.config ?? Spidergram.defaults;
  }

  static get status() {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(entry => entry[0].startsWith('SPIDERGRAM_'))
    );

    return {
      instantiated: Spidergram._instance !== undefined,
      initializing: Spidergram._instance?._initializing,
      initialized: !Spidergram._instance?._needsInit,
      loaded: !Spidergram._instance?._needsLoad,
      configFile: Spidergram._instance?.configFile,
      arango: Spidergram._instance?._arango !== undefined,
      env
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

    // Shared Arango connection. In the future we may instantiate custom Entities, build
    // indexes, and so on here.
    await this.attemptArangoConnection(true);

    // Centralized logging; also pipes logs to stderr unless logLevel is FALSE.
    this.setLogger(
      new Logger({
        defaultLevel: this.config.logLevel ? this.config.logLevel : undefined,
      }),
    );

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
        this.logger.getLogLevel(this.config.logLevel ? this.config.logLevel : 0)
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

    // CLI Utilities
    this._cli = this._loadedConfig?.value.cli ?? new SpiderCli();

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

    this._needsLoad = false;
    return Promise.resolve();
  }

  protected _needsInit = true;
  protected _initializing = false;
  protected _needsLoad = true;
  protected _loadedConfig?: Config<T>;
  protected _activeConfig: T;

  protected _logger?: Logger;
  protected _arango?: ArangoStore;
  protected _crawleeConfig?: CrawleeConfig;
  protected _normalizer?: UrlMutators.UrlMutator;
  protected _cli?: SpiderCli;

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

  get files() {
    return FileStore.disk.bind(FileStore);
  }

  get cli() {
    this._cli ??= new SpiderCli();
    return this._cli;
  }

  setLogger(input: Logger) {
    if (this._logger && this._logger !== input) {
      this._logger.end();
    }
    this._logger = input;

    if (this.config.logLevel) {
      // consider logging to Arango as well
      this._logger
        .pipe(
          new Filter({
            filterLevel:
              this._logger.getLogLevel(this.config.logLevel)?.levelNumber ?? 0,
          }),
        )
        .pipe(new Human({ color: true }))
        .pipe(process.stderr);
    }
  }

  get logger() {
    if (this._logger === undefined) {
      throw new SpidergramError('No Logger created');
    } else {
      return this._logger;
    }
  }

  setCrawleeConfig(input: CrawleeConfig) {
    this._crawleeConfig = input;
  }

  get crawlee() {
    return CrawleeConfig.getGlobalConfig();
  }
}
