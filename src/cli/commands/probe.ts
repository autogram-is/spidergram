import { Flags } from '@oclif/core';
import {
  CLI,
  SgCommand,
  BrowserTools,
  Resource,
  Query,
  aql,
  NormalizedUrl,
} from '../../index.js';

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
    const { graph } = await this.getProjectContext();
    const { args, flags } = await this.parse(Probe);

    const url = new NormalizedUrl(args.url);

    this.ux.action.start('Loading tech fingerprint patterns');
    await BrowserTools.Fingerprint.loadDefinitions({
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
      if (id) res = await graph.findById<Resource>(id);
    }

    if (res instanceof Resource) {
      console.log('analyzing stored resource');
      technologies.push(...BrowserTools.Fingerprint.analyzeResource(res));
    } else {
      if (flags.fetch !== false) {
        console.log('analyzing fetched response');
        const response = await fetch(url);
        const headers: Record<string, string[]> = {};
        const cookies: Record<string, string[]> = {};

        response.headers.forEach((value, key) => {
          if (key.toLocaleLowerCase() == 'set-cookie') {
            const entries = value.split(';');
            for (const ent of entries) {
              const pair = ent.split('=');
              cookies[pair[0]] ??= [];
              cookies[pair[0]] = cookies[pair[1]];
            }
          } else {
            headers[key.toLocaleLowerCase()] ??= [];
            headers[key.toLocaleLowerCase()].push(value);
          }
        });

        const input: BrowserTools.FingerprintInput = {
          url: url.href,
          headers,
          cookies,
          ...BrowserTools.Fingerprint.extractBodyData(await response.text()),
        };
        technologies.push(...BrowserTools.Fingerprint.analyze(input));
      } else {
        this.ux.error('Could not find resource for url');
      }
    }

    for (const tech of technologies) {
      this.ux.info(`${tech.name} ${tech.version} (${tech.website})`);
    }
  }
}
