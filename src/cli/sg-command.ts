import { CLI, JobStatus } from '../index.js';
import { ux, Command } from '@oclif/core';
import is from '@sindresorhus/is';

export enum OutputLevel {
  silent = 0,
  interactive = 1,
  verbose = 2,
}

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
export abstract class SgCommand extends Command {
  static enableJsonFlag = true;

  ux = ux;
  format = CLI.Colors;
  chalk = CLI.chalk;
  output = OutputLevel.interactive;
  progress = new CLI.progress.Bar({}, CLI.progress.Presets.shades_grey);

  protected get statics(): typeof SgCommand {
    return this.constructor as typeof SgCommand;
  }

  /**
   * Given a {JobStatus} object, display a status update to the user.
   *
   * By default, it will advance the console progress bar and update the ETA.
   * If the command is running in verbose mode, a line will be logged to stderr.
   * If the command is running in silent mode, nothing will be displayed.
   *
   * @protected
   * @param {JobStatus} status
   */
  protected updateProgress(status: JobStatus) {
    switch (this.output) {
      case OutputLevel.verbose: {
        this.ux.info(`Processed ${status.finished} of ${status.total}...`);
        break;
      }
      case OutputLevel.interactive: {
        this.progress.setTotal(status.total);
        this.progress.update(status.finished);
        break;
      }
    }
  }

  protected stopProgress(msg?: string) {
    if (
      is.nonEmptyStringAndNotWhitespace(msg) &&
      this.output !== OutputLevel.silent
    ) {
      this.ux.info(msg);
    }
    this.progress.stop();
  }

  protected startProgress(msg?: string, total = 0) {
    if (
      is.nonEmptyStringAndNotWhitespace(msg) &&
      this.output !== OutputLevel.silent
    ) {
      this.ux.info(msg);
    }
    if (this.output === OutputLevel.interactive) {
      this.progress = new CLI.progress.Bar(
        {},
        CLI.progress.Presets.shades_grey,
      );
      this.progress.start(total, 0);
    }
  }
}
