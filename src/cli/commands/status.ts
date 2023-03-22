import { SgCommand } from '../index.js';
import { Flags, ux } from '@oclif/core';
import { Spidergram } from '../../index.js';
import is from '@sindresorhus/is';
import { SpiderCli } from '../shared/spider-cli.js';

export default class SpidergramStatus extends SgCommand {
  static description = 'Settings and stats for the current project';

  static flags = {
    config: Flags.boolean({
      char: 'c',
      summary: 'Display detailed information about current settings',
    }),
    database: Flags.boolean({
      char: 'd',
      summary: 'Summarize the data stored in ArangoDB',
    }),
  };

  async run() {
    const { flags } = await this.parse(SpidergramStatus);
    const cli = new SpiderCli();
    const sg = await Spidergram.load();

    this.log(cli.header('Spidergram Config'));
    this.log(
      cli.infoList({ 'Config file': Spidergram.status.configFile ?? '<none>' }),
    );
    if (flags.config && Spidergram.status.configFile) {
      ux.styledJSON(sg.rawConfig);
    }

    if (flags.env && !is.emptyObject(Spidergram.status.env)) {
      this.log(cli.header('Environment Variables'));
      this.log(cli.infoList(Spidergram.status.env));
    }

    this.log(cli.header('ArangoDB'));
    this.log(
      cli.infoList({
        Status: Spidergram.status.arango ? 'online' : 'offline',
        URL: sg.config.arango?.url,
        Database: sg.config.arango?.databaseName,
      }),
    );

    if (flags.database && Spidergram.status.arango) {
      this.log();
      await sg.arango.db
        .listCollections()
        .then(async metadata => {
          const data: Record<string, unknown>[] = [];
          for (const coll of metadata) {
            const collection = sg.arango.db.collection(coll.name);
            const details = await collection.figures();
            data.push({
              name: coll.name,
              type: this.collectionType(coll.name, coll.type),
              records: details.count.toLocaleString(),
              bytes: Number.parseInt(
                details.figures['documentsSize'],
              ).toLocaleString(),
            });
          }
          return data;
        })
        .then(collections => {
          this.ux.table(
            collections,
            {
              name: { header: 'Collection', minWidth: 20 },
              type: {},
              records: {},
              bytes: {},
            },
            { sort: 'type' },
          );
        });
    }
  }

  collectionType(name: string, type: number) {
    if (name.startsWith('ds_')) return 'dataset';
    else if (name.startsWith('kv_')) return 'key-value';
    else return type === 2 ? 'entity' : 'relationship';
  }
}
