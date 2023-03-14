import { SgCommand } from '../../index.js';
import { CliUx } from '@oclif/core';
import chalk from 'chalk';
import { Spidergram } from '../../../index.js';
import is from '@sindresorhus/is';

export default class Config extends SgCommand {
  static description = 'Settings and stats for the current project';

  async run() {
    const sg = await Spidergram.load();

    if (!is.emptyObject(Spidergram.status.env)) {
      this.log(`${chalk.bold('Environment variables:')}`);
      CliUx.ux.styledJSON(Spidergram.status.env);  
    }

    this.log(
      `${chalk.bold('Config file:')} ${
        Spidergram.status.configFile ?? '<none>'
      }`,
    );

    if (Spidergram.status.configFile) {
      this.log(`${chalk.bold('Custom settings:')}`);
      CliUx.ux.styledJSON(sg.rawConfig);
    }

    if (Spidergram.status.initialized) {
      this.log(`${chalk.bold('Current settings:')}`);
      CliUx.ux.styledJSON(sg.config);
    }

    if (Spidergram.status.initialized) {
      this.log(`${chalk.bold('Global defaults:')}`);
      CliUx.ux.styledJSON(Spidergram.defaults);
    }
  }
}
