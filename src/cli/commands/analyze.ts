import {
  Spidergram,
  Resource,
  WorkerQuery,
  OutputLevel,
  GraphTools,
} from '../../index.js';
import { CLI, SgCommand } from '../index.js';
import { buildFilter } from '../shared/flag-query-tools.js';
import { queryFilterFlag } from '../shared/flags.js';
import { Flags } from '@oclif/core';

export default class Analyze extends SgCommand {
  static summary = 'Analyze the content of all crawled pages';

  static flags = {
    ...CLI.analysisFlags,
    filter: queryFilterFlag,
    concurrency: Flags.integer({
      summary: 'Analyze multiple pages simultaneously',
      default: 1,
    }),
    limit: Flags.integer({
      char: 'l',
      summary: 'The maximum number of results to process',
    }),
    verbose: CLI.outputFlags.verbose,
  };

  static strict = false;

  async run() {
    const { flags } = await this.parse(Analyze);
    const sg = await Spidergram.load();

    if (flags.verbose) {
      this.output = OutputLevel.verbose;
    }

    const options = sg.config.analysis ?? {};

    let defaultFlag: boolean | undefined = undefined;
    if (flags.all) {
      defaultFlag = true;
    } else if (flags.none) {
      defaultFlag = false;
    }


    // This series of checks is less than ideal, but until we clean up the configuration
    // data we have to navigate the inconsistencies of booleans and options being jammed
    // into the same variable.

    switch (flags.metadata) {
      case true:
        options.data = true;
        break;
      case false:
        options.data = false;
        break;
      default:
        if (defaultFlag === false) options.data = false;
        break;
    }

    switch (flags.content) {
      case true: 
        options.content = true;
        break;
      case false:
        options.content = false;
        break;
      default:
        if (defaultFlag === false) options.content = false;
        break;
    }

    switch (flags.tech) {
      case true:
        options.tech = true;
        break;
      case false:
        options.tech = false;
        break;
      default:
        if (defaultFlag === true) options.tech = true;
        break;
    }

    switch (flags.links) {
      case true:
        options.links = true;
        break;
      case false:
        options.links = false;
        break;
      default:
        if (defaultFlag === true) options.links = true;
        break;
    }


    // Options that can't accept a simple boolean
    switch (flags.properties) {
      case true:
        break;
      case false:
        options.properties = false;
        break;
      default:
        if (defaultFlag === false) options.properties = false;
        break;
    }

    switch (flags.designPatterns) {
      case true:
        break;
      case false:
        options.patterns = false;
        break;
      default:
        if (defaultFlag === false) options.patterns = false;
        break;
    }

    switch (flags.site) {
      case true:
        break;
      case false:
        options.site = false;
        break;
      default:
        if (defaultFlag === false) options.site = false;
        break;
    }

    const worker = new WorkerQuery<Resource>('resources', {
      concurrency: flags.concurrency,
    });
    for (const f of flags.filter ?? []) {
      worker.filterBy(buildFilter(f));
    }
    if (!flags.reprocess) {
      worker.filterBy({ path: '_analyzed', eq: null });
    }
    if (flags.limit) worker.limit(flags.limit);

    this.startProgress('Analyzing saved pages...');

    worker.on('progress', status => this.updateProgress(status));
    worker.on('end', status => {
      this.stopProgress();
      this.log(sg.cli.summarizeStatus(status));
    });

    await worker.run(async resource => {
      return GraphTools.analyzePage(resource, options)
        .then(resource => sg.arango.push(resource))
        .then(() => resource.url);
    });
  }
}

