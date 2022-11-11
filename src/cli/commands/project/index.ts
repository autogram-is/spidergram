import { SpidergramCommand, CLI } from '../../index.js';
import { CliUx } from '@oclif/core';
import chalk from 'chalk';

export default class ProjectInfo extends SpidergramCommand {
  static description = 'Settings and stats for the current project';

  static flags = {
    config: CLI.globalFlags.config,
  }

  async run() {
    const {project} = await this.getProjectContext();
    if (project.configFilePath !== undefined) {
      this.log(`${chalk.bold('Project:')} ${project.name}`);
      this.log(`${chalk.bold('Config file:')} ${project.configFilePath}`);
      this.log(`${chalk.bold('Settings:')}`);
      CliUx.ux.styledJSON(project.configuration);
    } else {
      this.log('No project configuration file could be found.');
    }
  }
}