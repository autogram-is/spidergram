import { Project } from '../index.js'
import { CliUx, Command, Flags, Interfaces } from '@oclif/core';

/**
 * A base command that provided common functionality for all Spidergram commands.
 * Most of these options are possible to wire together with tools in the Oclif library,
 * but the SpiderCommand class puts the simplest/standard approach within easy reach when
 * building a command.
 *
 * Functionality includes:
 *  - auto-instantiation of spidergram environment data wherever possible
 *  - Optional JSON output mode
 *  - stylized output (JSON, url, objects, headers)
 *  - Convenience wrappers for prompts and complex status updates
 *
 * All implementations of this class need to implement the run() method.
 *
 * Additionally, all implementations of this class need to provide a generic type that
 * describes their JSON output.
 *
 * Modeled on Salesforce's in-house CLI project, particularly the wrapper utilities
 * to manage JSON mode.
 * 
 * See {@link https://github.com/salesforcecli/sf-plugins-core/blob/main/src/sfCommand.ts sfCommand command class}.
 * See {@link https://github.com/salesforcecli/plugin-template-sf/blob/main/src/commands/hello/world.ts sfCommand implementation}.
 */

export abstract class SpidergramCommand extends Command {
  static enableJsonFlag = true;

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
  static tableFlags = CliUx.ux.table.flags;

  static globalFlags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to project configuration file',
    }),
  };
  
  get project(): Promise<Project> {
    return this.parse(this.constructor as Interfaces.Command.Class)
      .then((args) => Project.config(args?.flags?.config ?? undefined));
  }

  ux = CliUx.ux;

  protected get statics(): typeof SpidergramCommand {
    return this.constructor as typeof SpidergramCommand;
  }

  async stdin(): Promise<string | undefined> {
    return new Promise(resolve => {
      const stdin = process.openStdin();
      stdin.setEncoding('utf-8');
  
      let data = '';
      stdin.on('data', chunk => {
        data += chunk;
      })
  
      stdin.on('end', () => {
        resolve(data);
      })
  
      if (stdin.isTTY) {
        resolve('');
      }
    });
  }
}