import { CliUx } from '@oclif/core';
import { SpidergramCommand } from '../shared/index.js';

export default class Project extends SpidergramCommand<typeof Project> {
  static description = 'Project configuration';

  async run() {
    CliUx.ux.styledJSON(this.project.configuration);
  }
}