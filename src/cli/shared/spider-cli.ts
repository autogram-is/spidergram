import { JobStatus } from '../../index.js';
import { progress } from './progress.js';
import * as prompts from './prompts.js';
import terminalLink from 'terminal-link';
import { ux } from '@oclif/core';
import { chalk, joinOxford } from './format.js';
import { infoList } from './info-list.js';
import { summarizeStatus } from './summarize-status.js';

/**
 * This class is a rat's nest of helper utilities at the moment;
 * half of its utilities are wrappers around ux, others are overrides,
 * others are custom stuff we're using.
 */
export class SpiderCli {
  protected _progress?: progress.Bar;

  header(input: string) {
    return '\n' + chalk.bold(input.toLocaleUpperCase());
  }

  url(input: string | URL, label?: string) {
    return terminalLink(label ?? input.toString(), input.toString());
  }

  table = ux.table;
  json = ux.styledJSON;
  object = ux.styledObject;

  joinOxford = joinOxford;
  infoList = infoList;
  summarizeStatus = summarizeStatus;

  /**
   * Render an 'activity' indicator of some kind (a spinner, etc) followed by
   * an optional status message. Also sets `inProgress` to true; it will
   * remain busy until the `done` or `progress` methods are called.
   */
  busy(input: string) {
    if (!ux.action.running) {
      this.done();
      ux.action.start(input);
    } else {
      ux.action.status = input;
    }
    return `${ux.action.task}: ${ux.action.status}`;
  }

  newProgressBar() {
    return new progress.Bar({
      stopOnComplete: true,
      clearOnComplete: false,
      format: `\u001b[90m{bar}\u001b[0m {percentage}% | ETA: {eta}s | {value}/{total}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    });
  }

  /**
   * Render a progress bar based on a JobStatus object, with an optional
   * status message. This will set `inProgress` to true until the `done`
   * or `busy` methods are called.
   */
  progress(input: JobStatus, message?: string | undefined) {
    if (this._progress === undefined) {
      // Start progress
      this.done();
      this._progress = this.newProgressBar();
      this._progress.start(input.total, 0, { message: message });
      return `[${input.total} items]\t${message}`;
    } else {
      // Update progress
      this._progress.setTotal(input.total);
      this._progress.update(input.finished, { message: message });
      return `[${input.finished} / ${input.total}]\t${message}`;
    }
    return message;
  }

  /**
   * Ends any existing `busy` or `progress` state, renders an optional
   * status message, and `inProgress` to false.
   */
  done(input?: string | undefined) {
    if (this._progress) {
      this._progress.stop();
      this._progress = undefined;
    }
    if (ux.action.running) ux.action.stop(input);
    return input;
  }

  /**
   * Pause execution and display a confirmation prompt before proceeding.
   *
   * If the `timeout` parameter is set, the prompt will automatically dismiss
   * itself after the specified number of miliseconds, using the `initial` parameter
   * as its final answer.
   */
  confirm = prompts.confirm;

  anyKey = ux.anykey;
}
