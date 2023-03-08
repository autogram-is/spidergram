import { SgCommand, CLI } from '../../index.js';
import { CliUx } from '@oclif/core';
import chalk from 'chalk';
import { Spidergram } from '../../../config/spidergram.js';

export default class ProjectInfo extends SgCommand {
  static description = 'Settings and stats for the current project';

  static flags = {
    config: CLI.globalFlags.config,
  };

  async run() {
    const { project } = await this.getProjectContext();

    this.log(`${chalk.bold('Config file:')} ${ Spidergram.status.configFile ?? '<none>' }`);
    this.log(`${chalk.bold('Arango DB:')} ${ Spidergram.status.arango ? project.arango.db.name : '<none>' }`);
    if (Spidergram.status.configFile) {
      this.log(`${chalk.bold('Custom settings:')}`); 
      CliUx.ux.styledJSON(project.rawConfig);
    }
  }
}
