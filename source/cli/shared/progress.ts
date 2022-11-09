import * as progress from 'cli-progress';
import { SpiderStatistics } from '../../spider';
export { progress };


/**
 * CLI status updates for Spidergram crawls
 *
 * @export
 * @class CrawlBar
 * @typedef {CrawlBar}
 * @extends {progress.GenericBar}
 */
export class CrawlBar extends progress.GenericBar {
  constructor(opt: progress.Options, public _stats: SpiderStatistics) {
    super(opt);
  }

  get stats(): SpiderStatistics {
    return this._stats;
  }

  set stats(input: SpiderStatistics) {
    this._stats = input;
    // update bar
  }

  updateBar(current: number, payload?: SpiderStatistics): void {

  }
}


/**
 * CLI status updates for any Spidergram Worker class
 *
 * @export
 * @class WorkerBar
 * @typedef {WorkerBar}
 * @extends {progress.GenericBar}
 */
 export class WorkerBar extends progress.GenericBar {

}

/**
 * Preset example: 'progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}'
 * 
 * {bar} - the progress bar, customizable by the options barsize, barCompleteString and barIncompleteString
 * {percentage} - the current progress in percent (0-100)
 * {total} - the end value
 * {value} - the current value set by last update() call
 * {eta} -  expected time of accomplishment in seconds (limited to 115days, otherwise INF is displayed)
 * {duration} - elapsed time in seconds
 * {eta_formatted} - expected time of accomplishment formatted into appropriate units
 * {duration_formatted} - elapsed time formatted into appropriate units
 */
