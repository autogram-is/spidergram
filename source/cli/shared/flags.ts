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
    summary: 'Suppress messages and status updates',
    exclusive: ['silent'],
    helpGroup: 'OUTPUT',
  }),
  silent: Flags.boolean({
    char: 's',
    default: false,
    summary: 'Suppress messages and status updates',
    exclusive: ['silent'],
    helpGroup: 'OUTPUT',
  }),
}

export const crawlFlags = {
  'metadata': Flags.boolean({
    default: true,
    allowNo: true,
    summary: "Extract HTML page stats and metadata",
  }),
  'discover': Flags.enum<EnqueueStrategy | 'none'>({
    default: EnqueueStrategy.All,
    options: [
      EnqueueStrategy.All,
      EnqueueStrategy.SameDomain,
      EnqueueStrategy.SameHostname,
      'none'
    ],
    summary: "Link discovery strategy",
  }),
  'enqueue': Flags.enum<EnqueueStrategy | 'none'>({
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
    multiple: true,
    summary: 'MIME types to download if encountered',
  }),
  body: Flags.string({
    char: 'b',
    multiple: true,
    default: ['body'],
    summary: 'CSS selector for primary page content',
  }),
}
