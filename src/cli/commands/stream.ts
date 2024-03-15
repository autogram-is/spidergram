import { SgCommand } from '../index.js';
import {
  Spidergram,
  Resource,
} from '../../index.js';
import { Flags, Args } from '@oclif/core';
import { parse } from '@fast-csv/parse';
import path from 'path';

import fse from 'fs-extra';
import {
  isJsonMap,
} from '@salesforce/ts-types';
const { existsSync, createReadStream } = fse;

export default class Stream extends SgCommand {
  static description = 'Ingest large CSV and TSV files to Spidergram';
  static flags = {
    resources: Flags.boolean({
      char: 'r',
      summary: 'Import records as Resources',
      exactlyOne: ['urls', 'resources', 'dataset', 'kvs']
    }),

    urls: Flags.boolean({
      char: 'u',
      summary: 'Import records as Unique URLs',
    }),

    dataset: Flags.string({
      char: 'd',
      summary: 'Import records as a named Dataset',
    }),

    kvs: Flags.string({
      char: 'k',
      summary: 'Import data as named Key/Value store',
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
    const { flags, args } = await this.parse(Stream);
    const sg = await Spidergram.load();

    if (!existsSync(args.file)) {
      this.error(`File ${args.file} doesn't exist`);
    }

    const ext = path.parse(args.file).ext.toLocaleLowerCase();
    // Read in object mode and process as usual.

    createReadStream(args.file)
      .pipe(
        parse({
          headers: true,
          objectMode: true,
          delimiter: ext === '.tsv' ? '\t' : ',',
        }),
      )
      .on('data', async row => {
        if (isJsonMap(row)) {
          if ('url' in row && typeof row.url === 'string') {
            const resource = new Resource({ url: row.url })
            for (const [key, value] of Object.entries(row)) {
              if (value) resource.set(key, value);
            }
            if (flags.debug) {
              this.ux.styledObject(resource);
            } else {
              this.log(`Saving  ${resource.url}`);
              await sg.arango.push(resource);
            }
          }
        }
        return Promise.resolve();
      })
      .on('end', () => {
        console.log('All data imported.')
      });

    return Promise.resolve();
  }
}
