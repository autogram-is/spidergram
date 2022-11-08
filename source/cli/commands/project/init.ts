import { SpidergramCommand } from '../../shared/index.js';
import { writeFile } from 'node:fs/promises';
import { Project } from '../../../services/index.js';

export default class Init extends SpidergramCommand<typeof Init> {
  static description = 'Configure a new project';

  async run() {
    const path = this.project.configuration._configFilePath ?? Project.defaultConfigFilePath;
    const config = this.project.configuration;
    writeFile(path, JSON.stringify(config))
      .catch((error: unknown) => {
        if (error instanceof Error) {
          this.error(error, { exit: false })
        } else {
          throw new Error('w t f bro');
        }
      });
  }
}