import { Project, ArangoStore, CLI, JobStatus } from '../index.js'
import { CliUx, Command, Interfaces } from '@oclif/core';
import { Duration } from 'luxon';
import is from '@sindresorhus/is';

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

export enum OutputLevel {
  silent = 0,
  interactive = 1,
  verbose = 2,
}

export abstract class SgCommand extends Command {
  static enableJsonFlag = true;

  ux = CliUx.ux;
  format = CLI.Colors;
  chalk = CLI.chalk;
  symbol = CLI.Prefixes;
  output = OutputLevel.interactive;
  progress = new CLI.progress.Bar({}, CLI.progress.Presets.shades_grey);

  protected get statics(): typeof SgCommand {
    return this.constructor as typeof SgCommand;
  }

  // If no flags are set for a Spidergram Command, inherit
  // the shared global flags.
  static flags: Interfaces.FlagInput = {
    config: CLI.globalFlags.config,
    verbose: CLI.outputFlags.verbose
  }

  protected updateProgress(status: JobStatus) {
    switch (this.output) {
      case OutputLevel.verbose: {
        this.ux.info(`Processed ${status.finished} of ${status.total}...`);
        break;
      };
      case OutputLevel.interactive: {
        this.progress.setTotal(status.total);
        this.progress.update(status.finished);
        break;
      };
    }
  }

  protected stopProgress(msg?: string) {
    if (is.nonEmptyStringAndNotWhitespace(msg) && this.output !== OutputLevel.silent) {
      this.ux.info(msg);
    }
    this.progress.stop();
  }

  protected startProgress(msg?: string, total = 0) {
    if (is.nonEmptyStringAndNotWhitespace(msg) && this.output !== OutputLevel.silent) {
      this.ux.info(msg);
    }
    if (this.output === OutputLevel.interactive) {
      this.progress = new CLI.progress.Bar({}, CLI.progress.Presets.shades_grey);
      this.progress.start(total, 0);
    }
  }

  protected summarizeStatus(status: JobStatus) {
    this.stopProgress();
    if (this.output !== OutputLevel.silent) {
      const elapsed = status.finishTime - status.startTime;
      this.ux.info(`${status.finished.toLocaleString()} of ${status.total.toLocaleString()} items processed in ${Duration.fromMillis(elapsed).toHuman()}`);
      if (status.failed > 0) {
        this.ux.info(`${status.failed.toLocaleString()} items failed; the last error was '${status.lastError}'`);
      }
    }
  }

  async getProjectContext(returnErrors = false) {
    const errors: Error[] = [];
    let project = {} as unknown as Project;
    let graph = {} as unknown as ArangoStore;

    try {
      const {flags} = await this.parse(this.constructor as typeof SgCommand);
      const _configFilePath = is.string(flags.config) ? flags.config : undefined;
      project = await Project.config({ _configFilePath });
      graph = await project.graph();
    } catch(error: unknown) {
      if (is.error(error)) {
        errors.push(error);

        if (errors.length > 0 && !returnErrors) {
          for (let error of errors) this.ux.error(error);
        }
      }
    }
    
    return {
      project,
      graph,
      errors
    }
  }
}