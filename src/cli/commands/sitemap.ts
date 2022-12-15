import { CLI, SgCommand } from '../../index.js';

export default class GetSitemap extends SgCommand {
  static summary = 'Retrieve and analyze sitemap data';

  static usage = '<%= config.bin %> <%= command.id %> [urls]'

  static flags = {
    ...CLI.globalFlags,
  }

  static args = [{
    name: 'urls',
    description: 'One or more domains to examine',
    multiple: true
  }];

  static strict = false
  
  async run() {
    this.ux.info('Nothing to see here, yet.');
  }
}