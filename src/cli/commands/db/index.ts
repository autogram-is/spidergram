import { SgCommand, CLI } from '../../index.js';
import arrify from 'arrify';
import terminalLink from 'terminal-link';

export default class GraphInfo extends SgCommand {
  static description = 'Arango settings and status';

  static flags = {
    config: CLI.globalFlags.config,
  }

  async run() {
    const {project, graph} = await this.getProjectContext();
    const dbUrl = new URL(
      arrify(project.configuration.graph.connection.url)[0] ?? 'http://127.0.0.1:8529'
    );
    dbUrl.pathname = `_db/${graph.db.name}`;

    // This is actually very much not true.
    const dbStatus = graph.db.isArangoDatabase;

    this.ux.styledHeader(`Database: ${terminalLink(graph.db.name, dbUrl.toString())}`);
    this.ux.styledHeader(`Status: ${dbStatus ? 'online' : 'offline'}`);
    
    if (dbStatus) {
      await graph.db.listCollections()
        .then(collections => collections.map(collection => {
          return {
            name: collection.name,
            type: (collection.type === 2) ? 'document' : 'edge',
          }
        }))
        .then(collections => {
          this.ux.table(collections, {
            name: { header: 'Collection', minWidth: 20 },
            type: {},
          });
        })
    }
  }
}
