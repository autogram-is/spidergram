import { SgCommand, CLI } from '../../index.js';
import arrify from 'arrify';
import terminalLink from 'terminal-link';

export default class GraphInfo extends SgCommand {
  static description = 'Arango settings and status';

  static flags = {
    config: CLI.globalFlags.config,
  };

  async run() {
    const { project, graph } = await this.getProjectContext();
    const dbUrl = new URL(
      arrify(project.configuration.graph.connection.url)[0] ??
        'http://127.0.0.1:8529',
    );
    dbUrl.pathname = `_db/${graph.db.name}`;

    // This is actually very much not true.
    const dbStatus = graph.db.isArangoDatabase;

    this.ux.styledHeader(
      `Database: ${terminalLink(graph.db.name, dbUrl.toString())}`,
    );
    this.ux.styledHeader(`Status: ${dbStatus ? 'online' : 'offline'}`);

    if (dbStatus) {
      await graph.db
        .listCollections()
        .then(async metadata => {
          const data: Record<string, unknown>[] = [];
          for (const coll of metadata) {
            const collection = graph.db.collection(coll.name);
            const details = await collection.figures();
            data.push({
              name: coll.name,
              type: getCollectionType(coll.name, coll.type),
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
}

function getCollectionType(name: string, type: number) {
  if (name.startsWith('ds_')) return 'dataset';
  else if (name.startsWith('kv_')) return 'key-values';
  else return (type === 2 ? 'entities' : 'relationships')
}