import { SgCommand, CLI } from '../../index.js';
import { CliUx } from '@oclif/core';
import chalk from 'chalk';
import { Spidergram } from '../../../index.js';
import is from '@sindresorhus/is';

export default class ProjectInfo extends SgCommand {
  static description = 'Settings and stats for the current project';

  static flags = {
    config: CLI.globalFlags.config,
  };

  async run() {
    const sg = await Spidergram.load();

    this.log(
      `${chalk.bold('Config file:')} ${
        Spidergram.status.configFile ?? '<none>'
      }`,
    );
    this.log(
      `${chalk.bold('Arango DB:')} ${
        Spidergram.status.arango ? sg.arango.db.name : '<none>'
      }`,
    );
    if (Spidergram.status.configFile) {
      this.log(`${chalk.bold('Custom settings:')}`);
      CliUx.ux.styledJSON(sg.rawConfig);
    }
    if (!is.emptyObject(Spidergram.status.env)) {
      this.log(`${chalk.bold('Environment variables:')}`);
      CliUx.ux.styledJSON(Spidergram.status.env);
    }
  }
}
