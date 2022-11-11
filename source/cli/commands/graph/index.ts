import { SpidergramCommand, CLI } from '../../index.js';
import chalk from 'chalk';

export default class GraphInfo extends SpidergramCommand {
  static description = 'Settings and stats for the Arango database';

  static flags = {
    config: CLI.globalFlags.config,
  }

  async run() {
    const project = await this.project;
    const graph = await project.graph();

    await graph.db.listCollections()
      .then(collections => {
        for (let collection of collections) {
          this.log(chalk.bold('Collection: ') + `${collection.name}: ${collection.type}`);
        }
      });
  }
}
