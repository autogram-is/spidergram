import { SpidergramCommand } from '../index.js';

export default class Generate extends SpidergramCommand<typeof Generate> {
  static description = 'Create a new project from a spider template';

  async run() {
    this.log('Not yet implemented; come back soon.');
  }
}