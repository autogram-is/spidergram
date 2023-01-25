import { Flags } from '@oclif/core';
import { NormalizedUrlSet } from '@autogram/url-tools';
import { CLI, Query, SgCommand, aql, HierarchyTools } from '../../index.js';
import { URL_NO_COMMAS_REGEX, URL_WITH_COMMAS_REGEX } from 'crawlee';
import { readFile } from 'fs/promises';
import minimatch from 'minimatch';

export default class Urls extends SgCommand {
  static summary = 'Summarize a list of URLs';

  static usage = '<%= config.bin %> <%= command.id %> [urls]';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --input=urls.txt',
    '<%= config.bin %> <%= command.id %> --preset=collapse',
    "<%= config.bin %> <%= command.id %> --depth=5 --maxChildren=10 --highlight='**/*.pdf'",
  ];

  static flags = {
    ...CLI.globalFlags,
    input: Flags.string({
      char: 'i',
      summary: 'A database collection or filename.',
      default: 'resources',
    }),
    csv: Flags.boolean({
      char: 'c',
      summary: 'Treat input files as CSV',
      default: false,
    }),
    summary: Flags.boolean({
      char: 's',
      summary: 'Display summary information about the full pool of URLs',
      default: true,
    }),
    nonweb: Flags.boolean({
      char: 'n',
      summary: 'Include non-web URLs in the summary',
      dependsOn: ['summary'],
      default: false
    }),
    unparsable: Flags.boolean({
      char: 'u',
      summary: 'Include unparsable URLs in the summary',
      dependsOn: ['summary'],
      default: false
    }),
    hosts: Flags.boolean({
      char: 'h',
      summary: 'List the unique hostnames in the URL set',
      dependsOn: ['summary'],
      default: false
    }),
    hide: Flags.string({
      summary: 'URLs matching this string will be hidden from view',
      description: "Both --hide and --highlight use glob-style wildcards; '**/*cnn.com*' will match content on CNN or one of its domains; '**/news*' would only display the news directory and its descendents, and so on.",
      required: false
    }),
    highlight: Flags.string({
      summary: 'URLs matching this string will be highlighted',
      required: false
    }),
    tree: Flags.boolean({
      char: 't',
      summary: 'Display a visual tree view of the parsable web URLs',
      default: true,
    }),
    preset: Flags.enum({
      summary: 'A URL display preset',
      default: 'default',
      options: ['default', 'expand', 'collapse', 'plain']
    }),
    maxChildren: Flags.integer({
      char: 'm',
      summary: "Truncate lists of children longer than this limit",
      required: false,
    }),
    depth: Flags.integer({
      summary: 'Summarize branches deeper than this level',
      required: false,
    }),
    gaps: Flags.enum({
      summary: 'Gap resolution strategy',
      description: "How to deal with URL gaps, where a URL is implied by another URL's path but does not itself exist in the list of URLs. 'ignore' will discard URLs with gaps; 'adopt' will treat them as direct children of their closest ancestor, and 'bridge' will create intermediary URLs to accuratly represent the full path.",
      options: ['ignore', 'adopt', 'bridge'],
      default: 'bridge',
    }),
    subdomains: Flags.boolean({
      char: 'd',
      summary: 'Treat subdomains as children of their TLD',
      default: true,
    })
  };

  async run() {
    const { flags } = await this.parse(Urls);
    const { graph } = await this.getProjectContext();

    let rawUrls: string[] = [];
    let filteredUrls: string[] = [];

    if (flags.input.indexOf('.') !== -1) {
      const urlFile = await readFile(flags.input)
        .then(buffer => buffer.toString())
        .catch(() => this.error(`File ${flags.input} couldn't be opened`));
      rawUrls = urlFile.match(flags.csv ? URL_NO_COMMAS_REGEX : URL_WITH_COMMAS_REGEX) || [];
    } else {
      const collection = graph.collection(flags.input);
      if (await collection.exists() === false) {
        this.error(`Collection ${flags.input} doesn't exist`);
      }
      rawUrls = await Query.run<string>(aql`FOR item IN ${collection} FILTER item.url != null RETURN item.url`);
    }

    if (rawUrls.length === 0) {
      this.error('No URLs were found.');
    }

    filteredUrls = flags.hide ? rawUrls.filter(url => !minimatch(url, flags.hide ?? '')) : rawUrls;
    const urls = new NormalizedUrlSet(filteredUrls, { strict: false });
    
    const webUrls = [...urls].filter(url => ['http:', 'https:'].includes(url.protocol));

    const hosts = new Set<string>();
    for (const url of webUrls) {
      hosts.add(url.hostname);
    }
    
    const summary: Record<string, number| string[]> = {
      'Total URLs': rawUrls.length,
      'Unique Hosts': flags.hosts ? [...hosts] : [...hosts].length,
      'Hidden URLs': rawUrls.length - filteredUrls.length,
      'Unparsable Urls': urls.unparsable.size,
      'Non-Web URLs': urls.size - webUrls.length,
    };

    const output: string[] = [];
    if (flags.tree) {
      const treeOptions: HierarchyTools.UrlHierarchyBuilderOptions = { 
        subdomains: flags.subdomains ? 'children' : undefined
      };
      if (flags.gaps === 'adopt') treeOptions.gaps = 'adopt';
      if (flags.gaps === 'bridge') treeOptions.gaps = 'bridge';

      const renderOptions: HierarchyTools.RenderOptions = {
        preset: flags.preset,
        maxChildren: flags.childern,
        maxDepth: flags.depth,
        label: (item) => {
          if (item instanceof HierarchyTools.UrlHierarchyItem) {
            if (flags.highlight && minimatch(item.data.url.toString(), flags.highlight)) return this.chalk.bold(item.name);
            if (item.inferred) return this.chalk.dim(item.name); 
          }
          if (item.isRoot && flags.highlight === undefined) return this.chalk.bold(item.name);
          return item.name;
        }
      };

      const hierarchy = new HierarchyTools.UrlHierarchyBuilder(treeOptions).add(webUrls);
      summary['Orphaned URLs'] = hierarchy.items.filter(item => item.isOrphan).length;
      const roots = hierarchy.findRoots();

      for (const root of roots) {
        output.push(root.render(renderOptions));
      }
    }

    if (flags.summary) {
      this.infoList(summary);
    }
    if (flags.summary && flags.tree) this.log();
    if (flags.tree) {
      this.log(output.join('\n\n'));
    }
  }
}
