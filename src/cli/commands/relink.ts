import {
  Spidergram,
  Resource,
  WorkerQuery,
  relinkResource,
} from '../../index.js';
import { SgCommand } from '../index.js';

export default class Relink extends SgCommand {
  static summary = 'Rebuilds LinkTo relationships';

  async run() {
    const sg = await Spidergram.load();

    this.startProgress('Rebuilding links…');

    await new WorkerQuery<Resource>('resources')
      .filterBy('code', 200)
      .filterBy('mime', 'text/html')
      .on('progress', status => this.updateProgress(status))
      .on('end', status => {
        this.stopProgress('Complete!');
        this.ux.info(sg.cli.summarizeStatus(status));
      })
      .run(resource => relinkResource(resource).then(() => resource.url));
  }
}
