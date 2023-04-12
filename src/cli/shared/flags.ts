import { Flags, ux } from '@oclif/core';
import { UrlMatchStrategy } from '../../tools/urls/index.js';

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

export const tableFlags = ux.table.flags;

export const globalFlags = {
  force: Flags.boolean({
    char: 'f',
    default: false,
    summary: 'Bypass warnings (dangerous)',
    helpGroup: 'OUTPUT',
  }),
};

export const queryFilterFlag = Flags.string({
  char: 'f',
  summary: 'Filter records by a property',
  description: `"path" returns records where the property IS NOT null
"path = value" returns records where property equals value
"path != value" returns records where property DOES NOT equal value
"path > value" returns records where property is greater than value
"path < value" returns records where property is less than value
"path { value,value" returns records where values contain property
"path } value" returns records where value is contained in property`,
  multiple: true,
});

export const outputFlags = {
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
  discover: Flags.string({
    options: [
      UrlMatchStrategy.All,
      UrlMatchStrategy.SameDomain,
      UrlMatchStrategy.SameHostname,
      'none',
    ],
    summary: 'Link discovery strategy',
  }),
  enqueue: Flags.string({
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
  reprocess: Flags.boolean({
    char: 'r',
    summary: 'Reprocess already-analyzed pages',
    default: false
  }),
  body: Flags.string({
    char: 'b',
    multiple: true,
    summary: 'CSS selector for page content',
    required: false,
  }),
  content: Flags.boolean({
    char: 'c',
    allowNo: true,
    summary: 'Extract key page content',
    required: false,
  }),
  metadata: Flags.boolean({
    char: 'm',
    allowNo: true,
    summary: 'Extract page metadata',
    required: false,
  }),
  downloads: Flags.boolean({
    char: 'd',
    allowNo: true,
    summary: 'Parse and analyze supported downloads',
    required: false,
  }),
  tech: Flags.boolean({
    char: 't',
    allowNo: true,
    summary: 'Detect page technologies',
    required: false,
  }),
  links: Flags.boolean({
    char: 'k',
    allowNo: true,
    summary: 'Rebuild outgoing link metadata',
    required: false,
  }),
  properties: Flags.boolean({
    char: 'p',
    allowNo: true,
    summary: 'Extract page properties using rules from config',
    required: false,
  }),
};
