import { SgCommand } from '../index.js';
import { SpiderCli } from '../shared/spider-cli.js';
import { Spidergram, SpidergramConfig } from '../../index.js';
import { Flags } from '@oclif/core';
import { join } from 'path';
import { dump } from 'js-yaml';
import { ArangoStore } from '../../index.js';

import js5 from 'json5';
const { stringify } = js5;

import fse from 'fs-extra';
const { ensureDir, writeFile } = fse;

export default class Initialize extends SgCommand {
  static description = 'Configure a new Spidergram project';

  static flags = {
    format: Flags.string({
      char: 'f',
      summary: 'Configuration file format',
      options: ['json', 'yaml', 'json5'],
      default: 'json5',
    }),
    dbaddress: Flags.string({
      char: 'a',
      summary: 'Database Url',
      default: 'https://127.0.0.1:8529',
    }),
    dbname: Flags.string({
      char: 'd',
      summary: 'Database name',
      default: 'spidergram',
    }),
    dbuser: Flags.string({
      char: 'u',
      summary: 'Database user',
      default: 'root',
    }),
    dbpass: Flags.string({
      char: 'p',
      summary: 'Database password',
      default: '',
    }),
    config: Flags.string({
      char: 'c',
      summary: 'Config directory',
      default: './config',
    }),
    storage: Flags.string({
      char: 's',
      summary: 'Storage directory',
      default: './storage',
    }),
    output: Flags.string({
      char: 'o',
      summary: 'Output directory',
      default: './output',
    }),
    populate: Flags.boolean({
      char: 'p',
      summary: 'Populate the config file with common defaults',
      default: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(Initialize);
    const CLI = new SpiderCli();
    const sg = await Spidergram.load();

    if (sg.configFile) {
      // Is there already a config file? Prompt to ensure the user really wants to generate this.
      await CLI.confirm(
        `A configuration file already exists. Create one anyways?`,
      ).then(confirmed => {
        if (!confirmed) this.exit(0);
      });
    }

    const settings: SpidergramConfig = {
      configVersion: this.config.version,
      storageDirectory: flags.storage,
      outputDirectory: flags.output,
      arango: {
        databaseName: flags.dbname,
        url: flags.dbaddress,
        auth: {
          username: flags.dbuser,
          password: flags.dbpass,
        },
      },
    };

    if (flags.populate) {
      settings.normalizer = Spidergram.defaults.normalizer;
      settings.spider = {
        userAgent: `Spidergram ${this.config.version}`,
        maxConcurrency: Spidergram.defaults.spider?.maxConcurrency,
        maxRequestsPerMinute: Spidergram.defaults.spider?.maxRequestsPerMinute,
        urls: Spidergram.defaults.spider?.urls,
        downloadMimeTypes: Spidergram.defaults.spider?.downloadMimeTypes,
        saveCookies: !!Spidergram.defaults.spider?.saveCookies,
        savePerformance: !!Spidergram.defaults.spider?.savePerformance,
        saveXhrList: !!Spidergram.defaults.spider?.saveXhrList,
        auditAccessibility: !!Spidergram.defaults.spider?.auditAccessibility,
      };
      settings.analysis = Spidergram.defaults.analysis;
    }

    // Build the output path for the configuration file
    const path = join(process.cwd(), flags.config);
    const filePath = join(path, `spidergram.config.${flags.format}`);
    await ensureDir(path);

    let configData = '';
    switch (flags.format) {
      case 'json':
        configData = JSON.stringify(settings, undefined, 4);
        break;

      case 'json5':
        configData = stringify(settings, undefined, 4);
        break;

      case 'yaml':
        configData = dump(settings);
        break;
    }

    if (configData.length === 0) {
      this.error("The configuration file couln't be generated.");
    }

    await writeFile(filePath, configData).then(() =>
      this.log('Config file generated!'),
    );
  }
}

type ArangoStatus = {
  error?: boolean;
  server: boolean;
  auth: boolean;
  db: boolean;
};

export async function testConnection(
  name: string,
  host: string,
  user: string,
  pass: string,
): Promise<ArangoStatus> {
  const results = {
    error: true,
    server: true,
    auth: true,
    db: true,
  };

  const connection = await ArangoStore.open(undefined, {
    url: host,
    auth: {
      username: user,
      password: pass,
    },
  }).catch(() => results);

  if ('error' in connection) {
    return Promise.resolve(connection);
  } else {
    return Promise.resolve({
      server: true,
      auth: true,
      db: true,
    });
  }
}
