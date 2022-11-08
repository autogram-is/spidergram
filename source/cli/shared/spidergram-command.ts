import { Project } from '../../index.js'
import { CliUx, Command, Errors, Flags } from '@oclif/core';
import { Chalk } from 'chalk';
import logSymbols from 'log-symbols';

const chalk = new Chalk();

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

export abstract class SpidergramCommand extends Command {
  public static enableJsonFlag = true
  
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
  public static requireProject: boolean;

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
  public static tableFlags = CliUx.ux.table.flags;

  public static _globalFlags = {
    project: Flags.string({
      char: 'p',
      description: 'Project name',
    }),
  };

  protected get statics(): typeof SpidergramCommand {
    return this.constructor as typeof SpidergramCommand;
  }

  public readonly workingDir = process.cwd();

  protected async init(): Promise<any> {
    return super.init()
      .then(() => this.parse())
      .then(parserOutput => parserOutput.flags.project as (string | undefined))
      .then(projectName => Project.context({ name: projectName })) // We'll need to change this to pull in context
      .then(project => { this.project = project; })
      .catch((error: unknown) => {
        if (this.statics.requireProject) {
          this.error(`Project couldn't be created`);
        } else {
          this.debug(`Project couldn't be created`);
        }
      });
  }

  public project!: Project;
  
  // eslint-disable-next-line class-methods-use-this
  protected async loadProject(): Promise<Project> {
    try {
      // We need to actually instantiate the project from contextual data here.
      return Project.context();
    } catch (err) {
      if (err instanceof Error && err.name === 'InvalidProjectWorkspaceError') {
        throw new Errors.CLIError('Project config required', { exit: 1 });
      }
      throw err;
    }
  }
}