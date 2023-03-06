import load, { Config, LoadOptions } from '@proload/core';
import json from '@proload/plugin-json';
import typescript from '@proload/plugin-tsm';

import { Logger } from 'caterpillar';
import { ArangoStore } from "../services";
import { Configuration as CrawleeConfig } from "crawlee";
import { SpidergramConfig } from './config-interface';

import * as dotenv from 'dotenv';

export class SpidergramError extends Error {}

/**
 * A one-size fits-all entry point for using Spidergram; it manages and dispenses a
 * singleton instance of itself and handles initializing all of the dependent tools
 * that benefit from consistent configuration. In particular:
 * 
 * - Current configuration settings
 * - Contextual information about the "local project"
 * - A live connection to ArangoDB
 * - An instantiated Crawlee configuration class
 * - Centralized logging tool
 * - Light filesystem wrapper
 * - State for in-progress tasks
 */

export class Spidergram<T extends SpidergramConfig = SpidergramConfig> {
  protected static _instance: Spidergram;

  static async init<T extends SpidergramConfig = SpidergramConfig>() {
    if (this._instance) return Promise.resolve(this._instance);
    const sg = new Spidergram<T>();

    // Load the configuration
    dotenv.config({ override: true });

    sg._log = new Logger();

    await sg.loadConfig();

    // Set up the shared Arango connection. In the future, we want to manage
    sg._arango = await ArangoStore.open(sg._config?.value.arango?.databaseName, sg._config?.value.arango);

    // Give config scripts a chance to modify things
    if (sg._config?.value.init) {
      await sg._config?.value.init(sg);
    }

    // Set everything up based on the config values
    return Promise.resolve(this._instance);
  }

  protected _config: Config<T> | undefined;
  protected _log: Logger | undefined;
  protected _arango: ArangoStore | undefined;
  protected _crawleeConfig: CrawleeConfig | undefined;

  protected constructor() {
    Spidergram._instance = this;
  }

  protected async loadConfig() {
    // Load configuration from custom files
    load.use([typescript, json]);
    const options: LoadOptions<T> = {
      context: this,
      mustExist: false
    };
    this._config = await load('spidergram', options);
  }

  protected setLogger(logger: Logger) {
    this._log = logger;
  }

  get log(): Logger {
    if (this._log === undefined) throw new Error('No logger available');
    return this._log;
  }

  setArango(input: ArangoStore) {
    this._arango = input;
  }

  get arango(): ArangoStore {
    if (this._arango === undefined) throw new Error('No arango conection available');
    return this._arango;
  }
}
