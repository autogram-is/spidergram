import { Flags, CliUx } from "@oclif/core"
import { EnqueueStrategy } from "crawlee";

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
};

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
}

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
  })
}

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
    helpGroup: 'OUTPUT'
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
}

export const crawlFlags = {
  discover: Flags.enum<EnqueueStrategy | 'none'>({
    default: EnqueueStrategy.All,
    options: [
      EnqueueStrategy.All,
      EnqueueStrategy.SameDomain,
      EnqueueStrategy.SameHostname,
      'none'
    ],
    summary: "Link discovery strategy",
  }),
  enqueue: Flags.enum<EnqueueStrategy | 'none'>({
    default: EnqueueStrategy.SameDomain,
    options: [
      EnqueueStrategy.All,
      EnqueueStrategy.SameDomain,
      EnqueueStrategy.SameHostname,
      'none'
    ],
    summary: "Link enqueueing strategy",
  }),
  download: Flags.string({
    aliases: ['dl'],
    multiple: true,
    summary: 'MIME types to download if encountered',
  }),
  concurrency: Flags.integer({
    default: 1,
    summary: 'Max simultaneous requests'
  }),
  rate: Flags.integer({
    default: 300,
    summary: 'Max requests to process per minute'
  })
}

export const analysisFlags = {
  body: Flags.string({
    char: 'b',
    multiple: true,
    default: ['body'],
    summary: 'CSS selector for page content',
  }),
  text: Flags.boolean({
    char: 't',
    default: true,
    allowNo: true,
    summary: 'Generate plaintext version of page',
  }),
  readability: Flags.boolean({
    char: 'r',
    default: true,
    allowNo: true,
    summary: 'Calculate page readability',
  }),
  topics: Flags.boolean({
    char: 'w',
    default: true,
    allowNo: true,
    summary: 'Extract topics from page content',
  }),
  hierarchy: Flags.boolean({
    char: 'u',
    default: true,
    allowNo: true,
    summary: 'Calculate hierarchy from URL structure',
  }),
  metadata: Flags.boolean({
    char: 'm',
    default: true,
    allowNo: true,
    summary: "Extract page metadata",
  }),
}