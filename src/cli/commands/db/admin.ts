import { SgCommand, CLI } from '../../index.js';
import arrify from 'arrify';
import { CliUx } from '@oclif/core';

export default class Admin extends SgCommand {
  static description = "Launch Arango's web admin interface";

  static flags = {
    config: CLI.globalFlags.config,
  };

  async run() {
    const { project, graph } = await this.getProjectContext();
    const dbUrl = new URL(
      arrify(project.config.arango?.url)[0] ??
        'http://127.0.0.1:8529',
    );
    dbUrl.pathname = `_db/${graph.db.name}`;

    CliUx.ux.open(dbUrl.toString());
  }
}
