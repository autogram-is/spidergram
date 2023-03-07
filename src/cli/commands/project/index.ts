import { SgCommand, CLI } from '../../index.js';
import { CliUx } from '@oclif/core';
import chalk from 'chalk';

export default class ProjectInfo extends SgCommand {
  static description = 'Settings and stats for the current project';

  static flags = {
    config: CLI.globalFlags.config,
  };

  async run() {
    const { project } = await this.getProjectContext();
    if (project.configFile !== undefined) {
      this.log(`${chalk.bold('Project:')} ${project.configFile}`);
      this.log(
        `${chalk.bold('Config file:')} ${
          project.configFile
        }`,
      );
      this.log(`${chalk.bold('Settings:')}`);
      CliUx.ux.styledJSON(project.config);
    } else {
      this.log('No project configuration file could be found.');
    }
  }
}
