import { Flags, Args } from '@oclif/core';
import { Spidergram, Report } from '../../index.js';
import { SgCommand } from '../index.js';
import _ from 'lodash';
import { joinOxford } from '../../tools/text/join-oxford.js';

export default class DoReport extends SgCommand {
  static summary = 'Build and save a crawl report';

  static flags = {
    list: Flags.boolean({
      char: 'l',
      summary: 'List available stored reports',
    }),
    query: Flags.string({
      char: 'q',
      summary: 'Add a stored query to the generated report',
      multiple: true,
    }),
    name: Flags.string({
      char: 'n',
      summary: 'Report name',
    }),
  };

  static args = {
    report: Args.string({
      description: 'A named report from the project configuration.',
      required: false,
    }),
  };

  static strict = false;

  async run() {
    const { args, flags } = await this.parse(DoReport);
    const sg = await Spidergram.load();

    // We display a list of defined reports if someone requests it, or if they fail to
    // enter any options that would *produce* a report.

    if ((!args.report && !flags.query) || flags.list) {
      const reports = sg.config.reports;
      if (reports === undefined || Object.keys(reports).length === 0) {
        this.ux.info(
          `No reports are currently defined in the Spidergram configuration.`,
        );
        this.exit();
      } else {
        const data: Record<string, unknown>[] = Object.entries(reports).map(
          ([name, report]) => {
            return {
              report: name,
              category: report.category,
              description: report.description,
              type: report instanceof Report ? 'Class' : 'Spec',
            };
          },
        );
        this.ux.table(data, {
          report: { header: 'Report' },
          category: { header: 'Group' },
          description: { header: 'Description' },
          type: { header: 'Type' },
        });
        this.exit();
      }
    }

    const queryNames = flags.query?.filter(q => sg.config.queries?.[q]) ?? [];
    const queries: Record<string, string> = _.zipObject(queryNames, queryNames);

    const definition = sg.config.reports?.[args.report ?? ''];
    const report =
      definition instanceof Report ? definition : new Report(definition);
    report.queries = { ...report.queries, ...queries };
    if (flags.name) report.name = flags.name;

    report
      .on('progress', message => {
        if (message) this.ux.action.status;
      })
      .on('end', () => this.ux.action.stop());

    this.ux.action.start('Running report');
    await report.run();
    console.log(`Saved ${joinOxford(report.status.files)}.`);
  }
}
