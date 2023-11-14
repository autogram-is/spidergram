import { SgCommand } from '../index.js';
import { Spidergram, Dataset, KeyValueStore, UniqueUrl, UrlSource, NormalizedUrl } from '../../index.js';
import { Flags, Args } from '@oclif/core';
import { parse as parseCsv } from '@fast-csv/parse';
import { extractUrls } from 'crawlee';
import path from 'path';
import is from '@sindresorhus/is';

import fse from 'fs-extra';
import { JsonMap, asJsonMap, isJsonArray, isJsonMap } from '@salesforce/ts-types';
const { readFile, readJSON, existsSync, createReadStream } = fse;

export default class Import extends SgCommand {
  static description = 'Import URLs to crawl, or a dataset for analysis';

  static flags = {
    urls: Flags.boolean({
      char: 'u',
      summary: 'Import the data as crawlable URLs',
    }),

    dataset: Flags.string({
      char: 'd',
      summary: 'Collection name to store the imported records',
      exclusive: ['urls'] 
    }),

    key: Flags.string({
      char: 'k',
      summary: 'Record key property; if set, records will be saved to a KVS',
      exclusive: ['urls'] 
    }),

    normalize: Flags.string({
      char: 'n',
      summary: `Normalize URLs found in this property`,
      default: 'url',
      exclusive: ['urls'] 
    }),

    base: Flags.url({
      char: 'b',
      summary: 'Base address for relative URLs',
    })
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
          .then(json => isJsonArray(json) ? json : [])
          .then(json => json.map(j => asJsonMap(j)))
          .then(json => json.forEach(j => {
            if (j) rawData.push(j);
          }));
        break;

      case '.tsv':
      case '.csv':
        // Read in object mode and process as usual.
        createReadStream(args.file)
          .pipe(
            parseCsv({
              headers: true,
              objectMode: true,
              delimiter: (ext === '.tsv' ? '\t' : ',')
            })
            .on('error', error => this.error(error))
            .on('data', row => isJsonMap(row) ? rawData.push(row) : void 0 )
          );
        break;
        
      default:
        // We only support this for URL imports -- We'll try to parse the file
        // as text and save whatever URLs appear in the file.
        await readFile(args.file)
          .then(data => data.toString() ?? '')
          .then(string => extractUrls({ string }))
          .then(urls => urls.map(url => new UniqueUrl({ url, source: UrlSource.Import, base: flags.base })))
          .then(urls => sg.arango.push(urls, false))
          .then(results => this.ux.info(`Imported ${results.length} URLs`));
        this.exit();
    }

    if (rawData.length) {
      if (flags.urls) {
        const urls: UniqueUrl[] = rawData
          .map(r => (r.url ?? r.address ?? r.href)?.toString() ?? '').filter(u => u.length)
          .map(url => new UniqueUrl({ url, source: UrlSource.Import, base: flags.base }));
        await sg.arango.push(urls, false)
          .then(results => this.ux.info(`Imported ${results.length} URLs`));
        
      } else if (flags.normalize) {
        rawData.forEach(j => {
          if (flags.normalize in j && is.nonEmptyStringAndNotWhitespace(j[flags.normalize])) {
            const u = j[flags.normalize]?.toString() ?? '';
            j[flags.normalize] = new NormalizedUrl(u, flags.base).href
          }
        });  
      }

      if (flags.key) {
        const kvs = await KeyValueStore.open(flags.dataset);
        const entries = rawData
          .filter(d => flags.key && is.nonEmptyStringAndNotWhitespace(d[flags.key]))
          .map(d => [d[flags.key ?? ''], d]);
        await kvs.setValues(Object.fromEntries(entries));
      } else {
        const ds = await Dataset.open(flags.dataset);
        await ds.pushData(rawData);
      }

      this.ux.info(`Imported ${rawData.length} records`);
    }
  }
}
