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
    allowNo: true,
    default: false,
  }),
  site: Flags.boolean({
    char: 's',
    summary: 'Connect pages to sites',
    allowNo: true,
  }),
  content: Flags.boolean({
    char: 'c',
    allowNo: true,
    summary: 'Extract key page content',
  }),
  metadata: Flags.boolean({
    char: 'm',
    allowNo: true,
    summary: 'Extract page metadata',
  }),
  tech: Flags.boolean({
    char: 't',
    allowNo: true,
    summary: 'Detect page technologies',
  }),
  properties: Flags.boolean({
    char: 'p',
    allowNo: true,
    summary: 'Extract and map page properties',
  }),
  links: Flags.boolean({
    char: 'k',
    allowNo: true,
    summary: 'Rebuild outgoing link metadata',
  }),
  designPatterns: Flags.boolean({
    char: 'd',
    allowNo: true,
    summary: 'Extract instances of design patterns',
  }),
};
