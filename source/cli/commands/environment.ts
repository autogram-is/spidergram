import {Command} from '@oclif/core'
import { CliUx } from '@oclif/core';

export default class Environment extends Command {
  static description = 'Output environment details';

  static aliases = ['env'];

  async run() {
    const data = {
      config: this.config,
      env: process.env,
      cwd: process.cwd(),
      execPath: process.execPath,
    };

    CliUx.ux.styledJSON(data);
  }
}