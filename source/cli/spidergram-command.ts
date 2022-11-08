import { Project } from '../index.js'
import { CliUx, Command, Flags, Interfaces } from '@oclif/core';
import { Chalk } from 'chalk';
import logSymbols from 'log-symbols';
const chalk = new Chalk();

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof SpidergramCommand['globalFlags'] & T['flags']>

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
 * See {@link https://github.com/salesforcecli/sf-plugins-core/blob/main/src/SpiderCommand.ts sfCommand command class}.
 * See {@link https://github.com/salesforcecli/plugin-template-sf/blob/main/src/commands/hello/world.ts sfCommand implementation}.
 */

 export const StandardColors = {
  error: chalk.bold.red,
  warning: chalk.bold.yellow,
  info: chalk.dim,
  success: chalk.bold.green,
  highlight: chalk.bold.bgYellow,
};

export const StandardPrefixes = {
  error: logSymbols.error,
  warning: logSymbols.warning,
  info: logSymbols.info,
  success: logSymbols.success,
};

export abstract class SpidergramCommand<T extends typeof Command> extends Command {
  static enableJsonFlag = true
    
  /**
   * Throw an error if no project name is given, 
   * If set to true the command will throw an error if the command is executed without passing in 
   * valid configuration data, cannot find a spidergram.json file, and cannot find global environment
   * variables with spidergram config information.
   * 
   * If project information can be loaded successfully, `this.project` will be set to the resulting
   * Project instance.
   *
   */
  static requireProject: boolean;

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
  
  protected flags!: Flags<T>

  project!: Project;

  protected get statics(): typeof SpidergramCommand {
    return this.constructor as typeof SpidergramCommand;
  }

  async init(): Promise<void> {
    await super.init()
    const args = await this.parse(this.constructor as Interfaces.Command.Class);
    this.project = await Project.config(args.flags.config);
    return;
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