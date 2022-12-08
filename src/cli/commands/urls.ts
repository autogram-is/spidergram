import { Flags } from '@oclif/core';
import { NormalizedUrl } from '@autogram/url-tools';
import { CLI, SgCommand, aql } from '../../index.js';

export default class Urls extends SgCommand {
  static summary = 'Test URL normalization and filtering';

  static usage = '<%= config.bin %> <%= command.id %> [urls]'

  static examples = [
    '<%= config.bin %> <%= command.id %> https://example.com',
    '<%= config.bin %> <%= command.id %> --parsable --web --limit=100',
  ];

  static flags = {
    ...CLI.globalFlags,
    limit: Flags.integer({
      summary: 'Limit the number of URLs tested',
      default: 20,
    }),
    unchanged: Flags.boolean({
      summary: 'Show both changed and unchanged urls',
      default: false,
      allowNo: true,
    }),
    verbose: CLI.outputFlags.verbose
  }

  static args = [{
    name: 'urls',
    description: 'One or more URLs to crawl',
    multiple: true
  }];

  static strict = false
  
  async run() {
    const {graph} = await this.getProjectContext();
    const {argv: urls, flags} = await this.parse(Urls);

    const columns = {
      original: { header: 'Original' },
      normalized: { header: 'Normalized' }
    }

    let data: { original: string, normalized: string }[] = [];
    if (urls.length === 0) {
      const query = aql`
        FOR uu IN unique_urls
        RETURN (uu.parsed.original == null) ? uu.url : uu.parsed.original
      `;
      const dbUrls = await graph.query<string>(query).then(cursor => cursor.all());
      urls.push(...dbUrls);
    }

    const results = {
      total: urls.length,
      altered: 0,
      unparsable: 0
    };

    for (const url of urls) {
      try {
        const normal = new NormalizedUrl(url).href;
        if (normal === url) {
          if (flags.unchanged) {
            data.push({
              original: this.format.info(url),
              normalized: this.format.info('unchanged')
            });
          }
        } else {
          results.altered++;
          data.push({
            original: url,
            normalized: normal
          });
        }
      } catch {
        results.unparsable++;
        data.push({
          original: url,
          normalized: this.format.error('unparsable')
        });
      }
    }
    
    this.ux.table(data.slice(0, flags.limit - 1), columns);
    let message = `${this.format.success(results.total)} URLs total (${this.format.success(results.altered)} altered by normalizer`;
    if (results.unparsable > 0) {
      message += `, ${this.format.success(results.unparsable)} unparsable)`;
    } else {
      message += ')'
    }

    this.log();
    this.log(message);
  }
}