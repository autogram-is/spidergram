import { Flags } from '@oclif/core';
import { Spidergram } from '../../index.js';
import { CLI, SgCommand } from '../index.js';

export default class Cleanup extends SgCommand {
  static summary = 'A grab back of disk and database tidying';

  static usage = '<%= config.bin %> <%= command.id %>';

  static flags = {
    compact: Flags.boolean({
      description: 'Compact the spidergram database',
      default: true,
    }),

    eraseDb: Flags.boolean({
      description: 'Erase the spidergram database',
    }),
  };
  static strict = false;

  async run() {
    const sg = await Spidergram.load();
    const { flags } = await this.parse(Cleanup);

    if (flags.compact) {
      this.ux.action.start('Compacting data');
      for (const c of await sg.arango.db.listCollections()) {
        const collection = sg.arango.db.collection(c.name);
        await collection.compact();
      }
      this.ux.action.stop();
    }

    if (flags.eraseDb) {
      const dbName = sg.arango.db.name;
      const message = `Empty ${CLI.chalk.bold.red('all data')} from ${dbName}?`;
      const confirmation = flags.force ? true : await CLI.confirm(message);
      if (confirmation) {
        await sg.arango.erase({ eraseAll: true });
        this.log(`Data erased from ${dbName}.`);
      } else {
        this.log(`Data wipe canceled; ${dbName} was not modified.`);
      }
    }
  }
}
