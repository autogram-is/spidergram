import { SgCommand } from '../index.js';
import {
  Spidergram,
  Dataset,
  KeyValueStore,
  UniqueUrl,
  UrlSource,
  NormalizedUrl,
  isValidName,
  UuidFactory,
} from '../../index.js';
import { Flags, Args, Command } from '@oclif/core';
import { parse } from '@fast-csv/parse';
import { extractUrls } from 'crawlee';
import path from 'path';
import is from '@sindresorhus/is';

import fse from 'fs-extra';
import {
  JsonMap,
  asJsonMap,
  isJsonArray,
  isJsonMap,
} from '@salesforce/ts-types';
import _ from 'lodash';
const { readFile, readJSON, existsSync, createReadStream } = fse;

export default class Import extends SgCommand {
  static description = 'Import URLs to crawl, or a dataset for analysis';
  static examples: Command.Example[] = [
    {
      description: `Import and enqueue URLs from a sitemap.txt`,
      command: `spidergram import sitemap.txt --urls`,
    },
    {
      description: `Import a CSV file into the 'analytics' key value store, indexed by the 'address' column`,
      command: `spidergram import google-analytics.csv --dataset=analytics --key=address`,
    },
    {
      description: `Preview the output without saving the data`,
      command: `spidergram import my-data.json --debug`,
    },
  ];

  static flags = {
    urls: Flags.boolean({
      char: 'u',
      summary: 'Import the data as crawlable URLs',
    }),

    collection: Flags.string({
      char: 'c',
      summary: 'Collection name to store the imported records',
      exclusive: ['urls'],
    }),

    key: Flags.string({
      char: 'k',
      summary: 'Record key property; if set, records will be saved to a KVS',
      exclusive: ['urls', 'hash'],
    }),

    hash: Flags.string({
      char: 'h',
      summary:
        'Hash the specified properties to create a key, and save to a KVS',
      multiple: true,
      exclusive: ['urls'],
    }),

    normalize: Flags.string({
      char: 'n',
      summary: `Normalize URLs found in this property`,
      default: 'url',
      exclusive: ['urls'],
    }),

    base: Flags.url({
      char: 'b',
      summary: 'Base address for relative URLs',
    }),

    debug: Flags.boolean({
      summary: 'Output results to console rather than saving',
    }),
  };

  static args = {
    file: Args.file({
      description: 'File to import',
      required: true,
    }),
  };

  async run() {
    const { flags, args } = await this.parse(Import);
    const sg = await Spidergram.load();

    if (!existsSync(args.file)) {
      this.error(`File ${args.file} doesn't exist`);
    }

    const ext = path.parse(args.file).ext.toLocaleLowerCase();
    const rawData: JsonMap[] = [];

    switch (ext) {
      case '.json':
        readJSON(args.file)
          .then(json => (isJsonArray(json) ? json : []))
          .then(json => json.map(j => asJsonMap(j)))
          .then(json =>
            json.forEach(j => {
              if (j) rawData.push(j);
            }),
          );
        break;

      case '.tsv':
      case '.csv':
        // Read in object mode and process as usual.
        rawData.push(...(await readCsv(args.file, ext)));
        break;

      default:
        // We only support this for URL imports -- We'll try to parse the file
        // as text and save whatever URLs appear in the file.
        await readFile(args.file)
          .then(data => data.toString() ?? '')
          .then(string => extractUrls({ string }))
          .then(urls =>
            urls.map(
              url =>
                new UniqueUrl({
                  url,
                  source: UrlSource.Import,
                  base: flags.base,
                }),
            ),
          )
          .then(urls => {
            if (flags.debug) {
              this.logJson(urls.map(uu => uu.url));
              this.ux.info(`Processed but did not import ${urls.length} URLs`);
              return Promise.resolve();
            } else {
              return sg.arango
                .push(urls, false)
                .then(results =>
                  this.ux.info(`Imported ${results.length} URLs`),
                );
            }
          });
        this.exit();
    }

    if (rawData.length) {
      const storeName = flags.collection ?? path.parse(args.file).name;

      if (!isValidName(storeName)) {
        this.error(
          `${storeName} is not a valid dataset name. (A-Z, a-z, 0-9, underscores, and dashes only)`,
        );
      }

      if (flags.urls) {
        // We're inserting URLs into the crawl queue, not a separate dataset
        const urls: UniqueUrl[] = rawData
          .map(r => (r.url ?? r.address ?? r.href)?.toString() ?? '')
          .filter(u => u.length)
          .map(
            url =>
              new UniqueUrl({
                url,
                source: UrlSource.Import,
                base: flags.base,
              }),
          );

        if (flags.debug) {
          this.logJson(urls.map(uu => uu.url));
          this.ux.info(`Processed but did not import ${urls.length} URLs`);
        } else {
          await sg.arango
            .push(urls, false)
            .then(results => this.ux.info(`Imported ${results.length} URLs`));
        }
      } else if (flags.normalize) {
        // We're not inserting queue records, but there's a URL property to be normalized
        rawData.forEach(j => {
          if (
            flags.normalize in j &&
            is.nonEmptyStringAndNotWhitespace(j[flags.normalize])
          ) {
            const u = j[flags.normalize]?.toString() ?? '';
            j[flags.normalize] = new NormalizedUrl(u, flags.base).href;
          }
        });
      }

      if (flags.key) {
        const kvs = await KeyValueStore.open(storeName);
        const entries = rawData
          .filter(
            d => flags.key && is.nonEmptyStringAndNotWhitespace(d[flags.key]),
          )
          .map(d => [d[flags.key ?? ''], d]);
        if (flags.debug) {
          this.logJson(entries);
        } else {
          await kvs.setValues(Object.fromEntries(entries));
        }
      } else if (flags.hash) {
        const kvs = await KeyValueStore.open(storeName);
        const entries = rawData.map(d => {
          let hash = '';
          if (flags.hash && flags.hash.length == 1) {
            if (flags.hash[0] == 'all') {
              // Generate from the entire object
              hash = UuidFactory.generate(d);
            } else if (UuidFactory.isUuid(d[flags.hash[0]]?.toString() ?? '')) {
              // Hash is already a Uuid
              hash = d[flags.hash[0]]?.toString() ?? '';
            } else {
              // Generate from the key
              hash = UuidFactory.generate(d[flags.hash[0]]);
            }
          } else if (flags.hash && flags.hash.length > 1) {
            // Generate from a specific set of keys
            const props: Record<string, unknown> = {};
            for (const p of flags.hash) {
              props[p] = _.get(d, p);
            }
            hash = UuidFactory.generate(props);
          }
          return [hash, d];
        });
        if (flags.debug) {
          this.logJson(Object.fromEntries(entries));
        } else {
          await kvs.setValues(Object.fromEntries(entries));
        }
      } else {
        const ds = await Dataset.open(storeName);
        if (flags.debug) {
          this.logJson(rawData);
        } else {
          await ds.pushData(rawData);
        }
      }

      this.ux.info(
        `${flags.debug ? 'Processed but did not import' : 'Imported'} ${
          rawData.length
        } records`,
      );
    }
  }
}

async function readCsv(file: string, ext = '.csv') {
  const data: JsonMap[] = [];
  return new Promise<JsonMap[]>(resolve => {
    createReadStream(file)
      .pipe(
        parse({
          headers: true,
          objectMode: true,
          delimiter: ext === '.tsv' ? '\t' : ',',
        }),
      )
      .on('data', row => (isJsonMap(row) ? data.push(row) : console.log(row)))
      .on('end', () => resolve(data));
  });
}
