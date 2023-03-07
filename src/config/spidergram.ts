import load, { Config, LoadOptions } from '@proload/core';
import json from '@proload/plugin-json';
import typescript from '@proload/plugin-tsm';

import { ensureDir } from 'fs-extra';

import { Logger, Filter, Human } from 'caterpillar';
import { ArangoStore } from '../services';
import { Configuration as CrawleeConfig } from 'crawlee';
import { Storage as FileStore } from 'typefs';
import { SpidergramConfig } from './spidergram-config';
import { ParsedUrl, NormalizedUrl, UrlMutators } from '@autogram/url-tools';
import * as defaults from './defaults.js';

import * as dotenv from 'dotenv';
import is from '@sindresorhus/is';
import _ from 'lodash';
import { globalNormalizer } from './global-normalizer.js';

export class SpidergramError extends Error {}

export class Spidergram<T extends SpidergramConfig = SpidergramConfig> {
  protected static _instance: Spidergram;

  static get defaults(): SpidergramConfig {
    return defaults.spidergramDefaults;
  }

  static get config() {
    return this._instance?.config ?? Spidergram.defaults;
  }

  /**
   * Initializes a copy of Spidergram
   */
  static async init<T extends SpidergramConfig = SpidergramConfig>(
    filePath?: string,
    reset = false,
  ) {
    if (this._instance && !reset) return Promise.resolve(this._instance);

    const sg = this._instance ?? new Spidergram<T>();
    await sg.load(filePath);

    // Shared Arango connection. In the future we may instantiate custom Entities, build
    // indexes, and so on here.
    sg._arango = await ArangoStore.open(
      sg.config.arango?.databaseName,
      sg.config.arango,
    );

    // Centralized logging; also pipes logs to stderr unless logLevel is FALSE.
    sg._log = new Logger({
      defaultLevel: sg.config.logLevel ? sg.config.logLevel : undefined,
    });
    if (sg.config.logLevel) {
      // consider logging to Arango as well
      sg._log
        .pipe(
          new Filter({
            filterLevel:
              sg._log.getLogLevel(sg.config.logLevel)?.levelNumber ?? 0,
          }),
        )
        .pipe(new Human({ color: true }))
        .pipe(process.stderr);
    }

    // Crawlee configuration; in the future
    if (sg.config.crawlee instanceof CrawleeConfig) {
      sg._crawleeConfig = sg.config.crawlee;
    } else {
      sg._crawleeConfig = new CrawleeConfig(sg.config.crawlee);
      sg.crawlee.set(
        'logLevel',
        sg._log.getLogLevel(sg.config.logLevel ? sg.config.logLevel : 0)
          ?.levelNumber ?? 0,
      );
      // TODO: Implement Arango Storage Client for Crawlee
      // sg._crawleeConfig.useStorageClient(arangoStorageClient)
    }

    // Global URL normalizer
    if (is.function_(sg.config.urlNormalizer)) {
      sg.setNormalizer(sg.config.urlNormalizer);
    } else if (is.plainObject(sg.config.urlNormalizer)) {
      sg.setNormalizer((url: ParsedUrl) =>
        globalNormalizer(url, { ...sg.config.urlNormalizer }),
      );
    }

    // Give config scripts a chance to modify things
    if (sg._loadedConfig?.value.init) {
      await sg._loadedConfig?.value.init(sg);
    }

    // Set everything up based on the config values
    return Promise.resolve(sg);
  }

  protected async load(filePath?: string) {
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
    this._activeConfig = _.defaultsDeep(this._loadedConfig, this._activeConfig);

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

    // Set up file storage defaults
    if (this._activeConfig.typefs) {
      FileStore.config = this._activeConfig.typefs;
    } else {
      if (this._activeConfig.storageDirectory) {
        await ensureDir(this._activeConfig.storageDirectory);
        FileStore.config = {
          default: 'local',
          disks: {
            local: {
              driver: 'file',
              root: this._activeConfig.storageDirectory,
              jail: true,
            },
          },
        };
      }
    }

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
    if (this._arango === undefined)
      throw new SpidergramError('No connection to ArangoDB');
    return this._arango;
  }

  get files() {
    return FileStore.disk.bind(FileStore);
  }

  setCrawleeConfig(input: CrawleeConfig) {
    this._crawleeConfig = input;
  }

  get crawlee() {
    return CrawleeConfig.getGlobalConfig();
  }
}
