import { Flags, CliUx } from '@oclif/core';
import { UrlMatchStrategy } from '../../spider/index.js';

/**
 * Flags that you can use for manipulating tables.
 *
 * @example
 * ```
 * import { SpiderCommand } from '@autogram-is/spidergram';
 * export default class MyCommand extends SpiderCommand {
 *   public static flags = {
 *     ...SpiderCommand.tableFlags,
 *     myFlag: flags.string({ char: 'm', description: 'my flag' }),
 *   }
 * }
 * ```
 */

export const tableFlags = CliUx.ux.table.flags;

export enum OutputFormats {
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  TSV = 'tsv',
  INTERACTIVE = 'interactive',
}

export const globalFlags = {
  config: Flags.string({
    summary: 'Path to project configuration file',
    helpGroup: 'GLOBAL',
  }),
  options: Flags.string({
    summary: 'Use flags and args from YML or JSON',
    helpGroup: 'GLOBAL',
  }),
  force: Flags.boolean({
    char: 'f',
    default: false,
    summary: 'Bypass warnings (dangerous)',
    helpGroup: 'OUTPUT',
  }),
};

export const queryFlags = {
  limit: Flags.integer({
    default: 20,
    summary: 'Max number of results to return',
    helpGroup: 'QUERY',
  }),
  ascending: Flags.string({
    aliases: ['asc'],
    summary: 'Sort ascending by a property',
    multiple: true,
    helpGroup: 'QUERY',
  }),
  descending: Flags.string({
    aliases: ['desc'],
    summary: 'Sort descending by a property',
    multiple: true,
    helpGroup: 'QUERY',
  }),
  property: Flags.string({
    aliases: ['prop'],
    summary: 'Document property to be returned',
    multiple: true,
    default: ['key:_key'],
    helpGroup: 'QUERY',
  }),
};

export const outputFlags = {
  output: Flags.enum<OutputFormats>({
    default: OutputFormats.INTERACTIVE,
    options: [
      OutputFormats.INTERACTIVE,
      OutputFormats.JSON,
      OutputFormats.CSV,
      OutputFormats.TSV,
      OutputFormats.XML,
    ],
    summary: 'Control console output format',
    helpGroup: 'OUTPUT',
  }),
  verbose: Flags.boolean({
    char: 'v',
    default: false,
    summary: 'Display detailed status messages',
    exclusive: ['silent'],
    helpGroup: 'OUTPUT',
  }),
  silent: Flags.boolean({
    char: 's',
    default: false,
    summary: 'Suppress messages and status updates',
    exclusive: ['verbose'],
    helpGroup: 'OUTPUT',
  }),
};

export const crawlFlags = {
  discover: Flags.enum<UrlMatchStrategy | 'none'>({
    default: UrlMatchStrategy.All,
    options: [
      UrlMatchStrategy.All,
      UrlMatchStrategy.SameDomain,
      UrlMatchStrategy.SameHostname,
      'none',
    ],
    summary: 'Link discovery strategy',
  }),
  enqueue: Flags.enum<UrlMatchStrategy | 'none'>({
    default: UrlMatchStrategy.SameDomain,
    options: [
      UrlMatchStrategy.All,
      UrlMatchStrategy.SameDomain,
      UrlMatchStrategy.SameHostname,
      'none',
    ],
    summary: 'Link enqueueing strategy',
  }),
  download: Flags.string({
    aliases: ['dl'],
    multiple: true,
    summary: 'MIME type to download if encountered',
  }),
  concurrency: Flags.integer({
    summary: 'Max simultaneous requests',
  }),
  rate: Flags.integer({
    summary: 'Max requests to process per minute',
  }),
};

export const analysisFlags = {
  body: Flags.string({
    char: 'b',
    multiple: true,
    default: ['body'],
    summary: 'CSS selector for page content',
  }),
  content: Flags.boolean({
    char: 'c',
    default: true,
    allowNo: true,
    summary: 'Extract key page content',
  }),
  readability: Flags.boolean({
    char: 'r',
    default: true,
    allowNo: true,
    summary: 'Calculate content readability',
  }),
  metadata: Flags.boolean({
    char: 'm',
    default: true,
    allowNo: true,
    summary: 'Extract page metadata',
  }),
  tech: Flags.boolean({
    char: 't',
    default: true,
    allowNo: true,
    summary: 'Detect page technologies',
  }),
};
