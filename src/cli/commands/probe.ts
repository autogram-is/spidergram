import { Flags } from '@oclif/core';
import {
  Spidergram,
  CLI,
  SgCommand,
  BrowserTools,
  Resource,
  Query,
  aql,
  NormalizedUrl,
} from '../../index.js';
import { FingerprintResult } from '../../tools/browser/fingerprint.js';
import { SpiderCli } from '../shared/spider-cli.js';

export default class Probe extends SgCommand {
  static summary = 'Probe a web site to determine its technology stack';

  static usage = '<%= config.bin %> <%= command.id %> [url]';

  static flags = {
    ...CLI.globalFlags,
    fetch: Flags.boolean({
      char: 'f',
      description: 'Always fetch the URL.',
      allowNo: true,
    }),
    refresh: Flags.boolean({
      char: 'r',
      description: 'Refresh the fingerprint definitions.',
      default: false,
    }),
  };

  static args = [
    {
      name: 'url',
      description: 'A valid URL to analyze',
    },
  ];

  static strict = false;

  async run() {
    const sg = await Spidergram.load();
    const { args, flags } = await this.parse(Probe);

    const url = new NormalizedUrl(args.url);
    const fp = new BrowserTools.Fingerprint();

    this.ux.action.start('Loading tech fingerprint patterns');
    await fp.loadDefinitions({
      ignoreCache: flags.force ?? false,
      forceReload: true,
    });
    this.ux.action.stop();

    let res: Resource | undefined = undefined;
    const technologies: BrowserTools.FingerprintResult[] = [];

    if (flags.fetch !== true) {
      const id = (
        await Query.run<string>(aql`
        for uu in unique_urls
        filter uu.parsed.href == ${url.href}
        for rw in responds_with FILTER rw._from == uu._id
        for r in resources FILTER r._id == rw._to
        LIMIT 1
        return r._id
      `)
      ).pop();
      if (id) res = await sg.arango.findById<Resource>(id);
    }

    if (res instanceof Resource) {
      console.log('analyzing stored resource');
      technologies.push(...(await BrowserTools.getPageTechnologies(res)));
    } else {
      if (flags.fetch !== false) {
        console.log('analyzing fetched response');
        const response = await fetch(url);
        technologies.push(
          ...(await BrowserTools.getPageTechnologies(response)),
        );
      } else {
        this.ux.error('Could not find resource for url');
      }
    }

    if (technologies.length === 0) {
      this.ux.info('No technologies detected.');
    } else {
      this.ux.info(sg.cli.infoList(categorize(technologies)));
    }
  }
}

function categorize(input: FingerprintResult[]): Record<string, string[]> {
  const scl = new SpiderCli();
  const output: Record<string, string[]> = {};
  for (const t of input) {
    for (const c of t.categories) {
      output[c.name] ??= [];
      output[c.name].push(scl.url(t.website, t.name));
    }
  }
  return output;
}
