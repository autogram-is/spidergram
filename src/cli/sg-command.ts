import { Project, ArangoStore, CLI, JobStatus } from '../index.js';
import { CliUx, Command } from '@oclif/core';
import { Duration } from 'luxon';
import is from '@sindresorhus/is';
import { joinOxford } from '../tools/text/join-oxford.js';

export enum OutputLevel {
  silent = 0,
  interactive = 1,
  verbose = 2,
}

type InfoListOptions = {
  title?: string;
  align?: boolean;
};

type InfoListInput = Record<string, (number | string) | (number | string)[]>;

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

  ux = CliUx.ux;
  format = CLI.Colors;
  chalk = CLI.chalk;
  output = OutputLevel.interactive;
  progress = new CLI.progress.Bar({}, CLI.progress.Presets.shades_grey);

  protected infoList(
    input: InfoListInput,
    customOptions: InfoListOptions = {},
  ) {
    const options = { align: true, ...customOptions };
    const maxWidth = Object.keys(input).reduce((prev, current) =>
      prev.length > current.length ? prev : current,
    ).length;
    const lines: string[] = [];

    if (options.title) {
      lines.push(this.chalk.bold(options.title));
    }

    for (const [key, value] of Object.entries(input)) {
      const title = this.chalk.bold(key);
      const padding = options.align ? ' '.repeat(maxWidth - key.length) : '';
      const values = Array.isArray(value) ? value : [value];
      const content = joinOxford(
        values.map(v => (typeof v === 'string' ? v : v.toLocaleString())),
      );

      lines.push(`${title}:${padding} ${content}`);
    }

    if (lines.length) this.ux.info(lines.join('\n'));
  }

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

  /**
   * Given a {JobStatus} object, print a summary of what work was perfomed,
   * how long the operation took, and whether any errors were encountered.
   *
   * @protected
   * @param {JobStatus} status
   * @param {boolean} [listFailures=true]
   */
  protected summarizeStatus(status: JobStatus, listFailures = true) {
    this.stopProgress();
    if (this.output !== OutputLevel.silent) {
      const { finished, failed, total, startTime, finishTime } = status;
      const elapsed = Duration.fromMillis(finishTime - startTime)
        .rescale()
        .toHuman();

      if (total > finished) {
        this.ux.info(
          `${finished.toLocaleString()} of ${total.toLocaleString()} items processed in ${elapsed}`,
        );
      } else {
        this.ux.info(
          `${finished.toLocaleString()} items processed in ${elapsed}`,
        );
      }

      if (listFailures && failed > 0) {
        this.ux.info(
          `${failed.toLocaleString()} items failed; the last error was '${
            status.lastError
          }'`,
        );
      }
    }
  }

  /**
   * Loads instances of the {Project} and {ArangoStore} classes for
   * the current project; if the current command exposes a `context`
   * flag to override the default settings, this function will respect
   * the custom context.
   *
   * By default, this function throws an error if the Arango server
   * can't be reached, or tthe Project configuration data is malformed.
   * If the `returnErrors` parameter is true, it will instead return
   * an array of errors that can be checked and optionally displayed
   * to the user when graceful recovery is possible.
   *
   * This makes it easier to create functions that use the Project and
   * graph context *if they exist* but continue without them if they
   * can't be loaded.
   *
   * @async
   * @param {boolean} [returnErrors=false]
   * @returns {unknown}
   */
  async getProjectContext(returnErrors = false) {
    const errors: Error[] = [];
    let project = {} as unknown as Project;
    let graph = {} as unknown as ArangoStore;

    try {
      const { flags } = await this.parse(this.constructor as typeof SgCommand);
      const options = is.string(flags.config)
        ? { _configFilePath: flags.config }
        : undefined;
      project = await Project.config(options);
      graph = await project.graph();
    } catch (error: unknown) {
      if (is.error(error)) {
        errors.push(error);

        if (errors.length > 0 && !returnErrors) {
          for (const error of errors) this.ux.error(error);
        }
      }
    }

    return {
      project,
      graph,
      errors,
    };
  }
}
