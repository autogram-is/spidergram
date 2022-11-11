import { Flags, CliUx } from "@oclif/core"

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

export const globalFlags = {
  config: Flags.string({
    char: 'c',
    description: 'Path to project configuration file',
  })
}

export const workflowFlags = {
  force: Flags.boolean({
    char: 'f',
    default: false,
    description: 'Bypass warnings (dangerous)'
  }),
  yes: Flags.boolean({
    char: 'y',
    default: false,
    description: 'Bypass confirmation prompts'
  }),
  silent: Flags.boolean({
    char: 's',
    default: false,
    description: 'Suppress messages and status updates',
    exclusive: ['debug']
  })
}

export const crawlFlags = {
  'metadata': Flags.boolean({
    default: true,
    allowNo: true,
    summary: "Extract HTML page stats and metadata"
  }),
  'discover': Flags.boolean({
    default: true,
    allowNo: true,
    summary: "Look for links in HTML pages"
  }),
  'enqueue': Flags.boolean({
    default: true,
    allowNo: true,
    summary: "Add discovered links to the crawl queue",
    dependsOn: ['discover']
  }),
  download: Flags.string({
    multiple: true,
    summary: 'MIME types to download if encountered'
  }),
  body: Flags.string({
    multiple: true,
    default: ['body'],
    summary: 'CSS selector for primary page content'
  }),
}