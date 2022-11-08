import {Command} from '@oclif/core'
import {readStdinPipe} from '../shared/read-stdin-pipe.js'

export default class ReadPipe extends Command {
  static description = 'describe the command here';

  static examples = [
    `$ pipe-demo read hello world from read.ts!`,
  ];

  static args = [{name: 'file'}];

  async run() {
    this.parse(ReadPipe);

    const str = await readStdinPipe();

    if (str) {
      this.log(str);
    } else {
      this.log('Nothing piped in!');
      this.exit(0);
    }
  }
}