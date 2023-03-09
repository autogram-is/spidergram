import { SgCommand } from '../../index.js';
import { Spidergram } from '../../../index.js';
import { writeFile } from 'fs/promises';

export default class Init extends SgCommand {
  static description = 'Outputs a default Spidergram config file';

  async run() {
    await Spidergram.load();
    if (Spidergram.status.configFile) {
      this.ux.error(`A config file already exists in this directory. (${Spidergram.status.configFile})`);
    }
    await writeFile('spidergram.config.json', JSON.stringify(Spidergram.defaults, undefined, 2));
    this.log(`Wrote spidergram.config.json.`)
  }
}
