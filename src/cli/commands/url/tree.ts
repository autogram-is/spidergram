import { Flags, Args } from '@oclif/core';
import { NormalizedUrlSet } from '@autogram/url-tools';
import {
  Spidergram,
  Query,
  SgCommand,
  HierarchyTools,
  TextTools,
} from '../../../index.js';
import { URL_WITH_COMMAS_REGEX } from 'crawlee';
import { readFile } from 'fs/promises';
import minimatch from 'minimatch';
import { queryFilterFlag } from '../../shared/flags.js';
import { buildFilter } from '../../shared/flag-query-tools.js';

export default class UrlTree extends SgCommand {
  static summary = 'Build a tree from a list of URLs';

  static usage = '<%= config.bin %> <%= command.id %> [options] <filename.txt>';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> urls.txt',
    '<%= config.bin %> <%= command.id %> --preset=collapse',
    "<%= config.bin %> <%= command.id %> --depth=5 --children=10 --highlight='**/*.pdf'",
  ];

  static flags = {
    filter: queryFilterFlag,
    summary: Flags.boolean({
      summary: 'Display summary information about the full pool of URLs',
      default: true,
      allowNo: true,
      helpGroup: 'SUMMARY',
    }),
    nonweb: Flags.boolean({
      char: 'n',
      summary: 'List non-web URLs',
      dependsOn: ['summary'],
      default: false,
      helpGroup: 'SUMMARY',
    }),
    orphans: Flags.boolean({
      char: 'o',
      summary: 'List orphaned URLs',
      dependsOn: ['summary'],
      default: false,
      helpGroup: 'SUMMARY',
    }),
    unparsable: Flags.boolean({
      char: 'u',
      summary: 'List unparsable URLs',
      dependsOn: ['summary'],
      default: false,
      helpGroup: 'SUMMARY',
    }),
    hosts: Flags.boolean({
      char: 'h',
      summary: 'List the unique hostnames',
      dependsOn: ['summary'],
      default: false,
      helpGroup: 'SUMMARY',
    }),
    tree: Flags.boolean({
      summary: 'Display a visual tree view of the parsable web URLs',
      default: true,
      allowNo: true,
      helpGroup: 'FORMAT',
    }),
    hide: Flags.string({
      summary: 'URLs matching this string will be hidden from view',
      description:
        "Both --hide and --highlight use glob-style wildcards; '**/*cnn.com*' will match content on CNN or one of its domains; '**/news*' would only display the news directory and its descendents, and so on.",
      dependsOn: ['tree'],
      required: false,
      helpGroup: 'FORMAT',
    }),
    highlight: Flags.string({
      summary: 'URLs matching this string will be highlighted',
      required: false,
      dependsOn: ['tree'],
      helpGroup: 'FORMAT',
    }),
    preset: Flags.string({
      summary: 'A URL display preset',
      default: 'default',
      options: ['default', 'expand', 'collapse', 'markdown'],
      dependsOn: ['tree'],
      helpGroup: 'FORMAT',
    }),
    children: Flags.integer({
      summary: 'Max number of children to display in a directory',
      dependsOn: ['tree'],
      required: false,
      helpGroup: 'FORMAT',
    }),
    depth: Flags.integer({
      summary: 'Summarize directories deeper than this level',
      required: false,
      dependsOn: ['tree'],
      helpGroup: 'FORMAT',
    }),
    gaps: Flags.string({
      summary: 'Gap resolution strategy',
      description:
        "How to deal with URL gaps, where a URL is implied by another URL's path but does not itself exist in the list of URLs. 'ignore' will discard URLs with gaps; 'adopt' will treat them as direct children of their closest ancestor, and 'bridge' will create intermediary URLs to accuratly represent the full path.",
      options: ['ignore', 'adopt', 'bridge'],
      default: 'bridge',
      dependsOn: ['tree'],
      helpGroup: 'FORMAT',
    }),
    subdomains: Flags.boolean({
      char: 's',
      summary: 'Treat subdomains as children of their TLD',
      default: false,
      dependsOn: ['tree'],
      helpGroup: 'FORMAT',
    }),
  };

  static args = {
    input: Args.string({
      description: 'A database collection, local filename, or remote URL',
      default: 'resources',
    }),
  };

  async run() {
    const { args, flags } = await this.parse(UrlTree);
    const sg = await Spidergram.load();

    let rawUrls: string[] = [];
    let filteredUrls: string[] = [];

    this.ux.action.start('Loading URLs');

    if (isParsableUrl(args.input)) {
      const responseData = await fetch(new URL(args.input))
        .then(response => response.text())
        .catch(reason => {
          if (reason instanceof Error) this.ux.error(reason.message);
          else this.ux.error('An error occurred loading the URL.');
          return '';
        });
        
      rawUrls = responseData.match(URL_WITH_COMMAS_REGEX) || [];
    } else if (args.input.indexOf('.') !== -1) {
      const urlFile = await readFile(args.input)
        .then(buffer => buffer.toString())
        .catch(() => this.error(`File ${args.input} couldn't be opened`));
      rawUrls = urlFile.match(URL_WITH_COMMAS_REGEX) || [];
    } else {
      const collection = sg.arango.collection(args.input);
      if ((await collection.exists()) === false) {
        this.error(`Collection ${args.input} doesn't exist`);
      }

      const q = new Query(collection).filterBy('url').return('url');

      for (const f of flags.filter ?? []) {
        q.filterBy(buildFilter(f));
      }

      rawUrls = await q.run<string>();
    }

    if (rawUrls.length === 0) {
      this.error('No URLs were found.');
    }

    this.ux.action.stop();

    filteredUrls = flags.hide
      ? rawUrls.filter(url => !minimatch(url, flags.hide ?? ''))
      : rawUrls;
    const urls = new NormalizedUrlSet(filteredUrls, { strict: false });

    const webUrls = [...urls].filter(url =>
      ['http:', 'https:'].includes(url.protocol),
    );

    const hosts = new Set<string>();
    for (const url of webUrls) {
      hosts.add(url.hostname);
    }

    const summary: Record<string, number | string[]> = {
      'Total URLs': rawUrls.length,
    };
    if (hosts.size > 1) {
      summary['Unique Hosts'] = flags.hosts ? [...hosts] : [...hosts].length;
    }
    if (rawUrls.length - filteredUrls.length > 0) {
      summary['Hidden URLs'] = rawUrls.length - filteredUrls.length;
    }
    if (urls.unparsable.size) {
      summary['Unparsable Urls'] = flags.unparsable
        ? [...urls.unparsable]
        : urls.unparsable.size;
    }
    if (urls.size - webUrls.length > 0) {
      summary['Non-Web URLs'] = flags.nonweb
        ? [...urls]
            .filter(url => !['https:', 'http:'].includes(url.protocol))
            .map(url => url.href)
        : urls.size - webUrls.length;
    }

    const output: string[] = [];

    const treeOptions: HierarchyTools.UrlHierarchyBuilderOptions = {
      subdomains: flags.subdomains ? 'children' : undefined,
    };

    if (flags.gaps === 'adopt') treeOptions.gaps = 'adopt';
    if (flags.gaps === 'bridge') treeOptions.gaps = 'bridge';

    const renderOptions: HierarchyTools.RenderOptions = {
      preset: flags.preset,
      maxChildren: flags.children,
      maxDepth: flags.depth,
      label: item => {
        if (item instanceof HierarchyTools.UrlHierarchyItem) {
          if (
            flags.highlight &&
            minimatch(item.data.url.toString(), flags.highlight)
          )
            return this.chalk.bold(item.name);
          if (item.inferred) return this.chalk.dim(item.name);
        }
        if (item.isRoot && flags.highlight === undefined)
          return this.chalk.bold(item.name);
        return item.name;
      },
    };

    if (flags.preset === 'markdown') {
      renderOptions.label = item => {
        if (item instanceof HierarchyTools.UrlHierarchyItem) {
          return `${item.isRoot ? '## ' : ''}[${
            item.name
          }](${item.data.url.toString()})`;
        }
        return item.name;
      };
    }

    const hierarchy = new HierarchyTools.UrlHierarchyBuilder(treeOptions).add(
      webUrls,
    );
    const orphans = hierarchy.items.filter(item => item.isOrphan).length;
    if (orphans > 0) {
      if (flags.orphans) {
        summary['Orphaned URLs'] = hierarchy.items
          .filter(item => item.isOrphan)
          .map(orphan => orphan.data.url.toString());
      } else {
        summary['Orphaned URLs'] = orphans;
      }
    }

    if (flags.summary) {
      if (flags.preset === 'markdown') {
        const summaryLines: string[] = [];
        summaryLines.push('# URL Summary');
        for (const [bullet, content] of Object.entries(summary)) {
          if (typeof content === 'number') {
            summaryLines.push(
              `- **${bullet}**: ${content.toLocaleString().trim()}`,
            );
          } else {
            summaryLines.push(
              `- **${bullet}**: ${TextTools.joinOxford(content).trim()}`,
            );
          }
        }
        output.push(summaryLines.join('\n'));
      } else {
        this.log(sg.cli.header('URL Summary'));
        this.log(sg.cli.infoList(summary));
      }
    }

    if (flags.tree) {
      for (const root of hierarchy.findRoots()) {
        output.push(root.render(renderOptions));
      }
    }

    this.log();
    this.log(output.join('\n\n'));
  }
}

function isParsableUrl(input: string) {
  try {
    new URL(input.trim());
    return true;
  } catch {
    return false;
  }
}
