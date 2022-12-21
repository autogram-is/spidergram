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
    if (project.configuration._configFilePath !== undefined) {
      this.log(`${chalk.bold('Project:')} ${project.name}`);
      this.log(
        `${chalk.bold('Config file:')} ${
          project.configuration._configFilePath
        }`,
      );
      this.log(`${chalk.bold('Settings:')}`);
      CliUx.ux.styledJSON(project.configuration);
    } else {
      this.log('No project configuration file could be found.');
    }
  }
}
