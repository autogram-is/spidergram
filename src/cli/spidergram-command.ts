import { Project, ArangoStore, CLI } from '../index.js'
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

  ux = CliUx.ux;

  format = CLI.Colors;
  chalk = CLI.chalk;
  symbol = CLI.Prefixes;

  protected get statics(): typeof SpidergramCommand {
    return this.constructor as typeof SpidergramCommand;
  }

  // If no flags are set for a Spidergram Command, inherit
  // the shared global flags.
  static flags: Interfaces.FlagInput = {
    config: CLI.globalFlags.config
  }

  async getProjectContext(returnErrors = false) {
    const promise = this.parse(this.constructor as Interfaces.Command.Class)
      .then(({flags}) => Project.config(flags?.config ?? undefined));

    const errors: Error[] = [];
    const project = await promise
      .catch(error => { errors.push(error); return undefined as unknown as Project; });

    const graph = await project?.graph()
      .catch(error => { errors.push(error as Error); return undefined as unknown as ArangoStore; });

    if (errors.length > 0 && !returnErrors) {
      for (let error of errors) this.ux.error(error);
    }
    
    return {
      project: project,
      graph: graph,
      errors
    }
  }
}