import { Spidergram, CLI, SgCommand } from '../../../index.js';
import { Args } from '@oclif/core';
export default class Compact extends SgCommand {
  static description = 'Compact existing data';

  static flags = {
    config: CLI.globalFlags.config,
  };

  static args = {
    collections: Args.string({
      description: 'One or more graph collections',
      required: false,
    }),
  };

  static usage = '<%= config.bin %> <%= command.id %> [collections...]';

  static strict = false;

  async run() {
    const { argv } = await this.parse(Compact);
    const sg = await Spidergram.load();

    const compactAll = argv.length === 0;
    const results: Record<string, [number, number]> = {};
    for (const c of await sg.arango.db.listCollections()) {
      if (compactAll || argv.includes(c.name.toLocaleLowerCase())) {
        const collection = sg.arango.db.collection(c.name);
        const before = await collection.figures();
        await collection.compact();
        const after = await collection.figures();
        results[c.name] = [
          before.figures['documentsSize'],
          after.figures['documentsSize'],
        ];
      }
    }

    for (const [name, sizes] of Object.entries(results)) {
      this.ux.info(
        `${name}:\t${sizes[0].toLocaleString()} to ${sizes[1].toLocaleString()}`,
      );
    }
  }
}
