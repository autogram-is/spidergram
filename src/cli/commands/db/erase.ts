import { Flags, Args } from '@oclif/core';
import { Spidergram, CLI, TextTools, SgCommand } from '../../../index.js';
export default class Erase extends SgCommand {
  static description = 'Discard stored crawling data';

  static flags = {
    config: CLI.globalFlags.config,
    force: CLI.globalFlags.force,
    all: Flags.boolean({
      char: 'a',
      summary: 'Delete all collections',
    }),
  };

  static args = {
    collections: Args.string({
      description: 'One or more graph collections',
      required: false,
    }),
  };

  static usage =
    '<%= config.bin %> <%= command.id %> --force --all <collections...>';
  static examples = [
    '<%= config.bin %> <%= command.id %> unique_urls responds_with',
    '<%= config.bin %> <%= command.id %> --all --force',
  ];

  static strict = false;

  async run() {
    const { argv, flags } = await this.parse(Erase);
    const sg = await Spidergram.load();

    const dbName = sg.arango.db.name;
    let message = `Empty the collection${
      argv.length > 1 ? 's' : ''
    } ${TextTools.joinOxford(argv)} from ${dbName}?`;
    if (flags.all) {
      message = `Empty ${CLI.chalk.bold.red('all data')} from ${dbName}?`;
    }

    const confirmation = flags.force ? true : await CLI.confirm(message);

    if (confirmation) {
      await sg.arango.erase({ eraseAll: true });
      this.log(`Data erased from ${dbName}.`);
    }
  }
}
