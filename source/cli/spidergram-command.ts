import { Project, CLI } from '../index.js'
import { CliUx, Command, Interfaces } from '@oclif/core';

/**
 * A base command that provided common functionality for all Spidergram commands.
 * Most of these options are possible to wire together with tools in the Oclif library,
 * but the SpiderCommand class puts the simplest/standard approach within easy reach when
 * building a command.
 *
 * Functionality includes:
 *  - Easy instantiation of spidergram project context
 *  - A growing cluster of support functions
 *  - stylized output (JSON, url, objects, headers)
 *  - Convenience wrappers for prompts and complex status updates
 *
 * All implementations of this class need to implement the run() method.
 */

export abstract class SpidergramCommand extends Command {
  static enableJsonFlag = true;

  get project(): Promise<Project> {
    return this.parse(this.constructor as Interfaces.Command.Class)
      .then((args) => Project.config(args?.flags?.config ?? undefined));
  }

  ux = CliUx.ux;

  protected get statics(): typeof SpidergramCommand {
    return this.constructor as typeof SpidergramCommand;
  }

  static flags = {
    config: CLI.globalFlags.config
  };

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