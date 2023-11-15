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
    debug: Flags.boolean({
      summary: 'Preview the settings, but do not run the analysis',
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

    const process: Record<string, boolean | undefined> = {
      all: flags.all,
      none: flags.none,
      site: flags.site ?? flags.all ?? !flags.none,
      metadata: flags.metadata ?? flags.all ?? !flags.none,
      content: flags.content ?? flags.all ?? !flags.none,
      properties: flags.properties ?? flags.all ?? !flags.none,
      tech: flags.tech ?? flags.all ?? false,
      patterns: flags.designPatterns ?? flags.all ?? false,
      links: flags.links ?? flags.all ?? false,
    };

    const options = sg.config.analysis ?? {};

    if (process.site == false) options.site = false;
    if (process.metadata == false) options.data = false;
    if (process.content == false) options.content = false;
    if (process.properties == false) options.properties = false;
    if (process.tech == false) options.tech = false;
    if (process.patterns == false) options.patterns = false;
    if (process.links == true) options.links = true;

    if (flags.debug) {
      this.ux.styledHeader('Flags:');
      this.ux.styledJSON(process);

      this.ux.styledHeader('Analysis options:');
      this.ux.styledJSON({
        concurrency: flags.concurrency?.toString(),
        limit: flags.limit?.toString(),
        ...options,
      });
      this.exit();
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
