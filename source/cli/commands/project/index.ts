import { SpidergramCommand } from '../../shared/index.js';
import { CliUx } from '@oclif/core';
import chalk from 'chalk';

export default class ProjectInfo extends SpidergramCommand<typeof ProjectInfo> {
  static description = 'Display project information';

  async run() {
    const config = this.project.configuration;
    if (!this.project.configFilePath) {
      this.log('No project configuration file could be found.');
    } else {
      this.log(`${chalk.bold('Project:')} ${this.project.name}`);
      this.log(`${chalk.bold('Config file:')} ${this.project.configFilePath}`);
      this.log(`${chalk.bold('Settings:')}`);
      CliUx.ux.styledJSON(config);
    }
  }
}