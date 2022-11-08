import { Project } from '../index.js'
import { CliUx, Command, Flags, Interfaces } from '@oclif/core';
import { Chalk } from 'chalk';
import logSymbols from 'log-symbols';
import { Answers, QuestionCollection, default as inquirer } from 'inquirer';
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
 * See {@link https://github.com/salesforcecli/sf-plugins-core/blob/main/src/sfCommand.ts sfCommand command class}.
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
  static enableJsonFlag = true

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
  
  project!: Project;
  ux = CliUx.ux;

  protected get statics(): typeof SpidergramCommand {
    return this.constructor as typeof SpidergramCommand;
  }

  async init(): Promise<void> {
    await super.init()
    const args = await this.parse(this.constructor as Interfaces.Command.Class);
    this.project = await Project.config(args.flags.config);
    return;
  }

  /**
   * Simplified prompt for single-question confirmation. Times out and throws after 10s
   *
   * @param message text to display.  Do not include a question mark.
   * @param ms milliseconds to wait for user input.  Defaults to 10s.
   * @return true if the user confirms, false if they do not.
   */
  public async confirm(message: string, ms = 10_000): Promise<boolean> {
    const { confirmed } = await this.timedPrompt<{ confirmed: boolean }>(
      [ { name: 'confirmed', message, type: 'confirm', }, ], ms
    );
    return confirmed;
  }

  /**
   * Prompt user for information with a timeout (in milliseconds). See https://www.npmjs.com/package/inquirer for more.
   */
  // eslint-disable-next-line class-methods-use-this
  public async timedPrompt<T extends Answers>(
    questions: QuestionCollection<T>,
    ms = 10000,
    initialAnswers?: Partial<T>
  ): Promise<T> {
    let id: NodeJS.Timeout;
    const thePrompt = inquirer.prompt(questions, initialAnswers);
    const timeout = new Promise((_, reject) => {
      id = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        thePrompt.ui['activePrompt'].done();
        CliUx.ux.log();
        reject(new Error(`Timed out after ${ms} ms.`));
      }, ms).unref();
    });

    return Promise.race([timeout, thePrompt]).then((result) => {
      clearTimeout(id);
      return result as T;
    });
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