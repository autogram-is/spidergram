import { Spidergram } from '../../../index.js';
import { SgCommand, CLI } from '../../index.js';
import arrify from 'arrify';
import { CliUx } from '@oclif/core';

export default class Admin extends SgCommand {
  static description = "Launch Arango's web admin interface";

  static flags = {
    config: CLI.globalFlags.config,
  };

  async run() {
    const sg = await Spidergram.load();
    const dbUrl = new URL(
      arrify(sg.config.arango?.url)[0] ?? 'http://127.0.0.1:8529',
    );
    dbUrl.pathname = `_db/${sg.arango.db.name}`;

    CliUx.ux.open(dbUrl.toString());
  }
}
