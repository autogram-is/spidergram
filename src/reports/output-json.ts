import { BaseReportSettings, ReportConfig } from './report-types.js';
import { ReportRunner, Spidergram } from '../index.js';
import JSON5 from 'json5';
import path from 'path';

/**
 * Report output settings for JSON and JSON5 file formats
 */
export type JsonReportSettings = BaseReportSettings & {
  /**
   * File format to generate. JSON5 files are structurally similar to JSON, but allow
   * unquoted string keys, trailing commas, and inline comments like Javascript code.
   *
   * @defaultValue 'json'
   */
  type: 'json' | 'json5';

  /**
   * Format the JSON output file with linebreaks and indentation. Output files are
   * larger, but easier to read.
   *
   * @defaultValue false
   */
  readable?: boolean;

  /**
   * If the report contains multiple queries, combine all results into a single
   * JSON output file.
   *
   * @defaultValue false
   */
  combine?: boolean;
};

export async function outputJsonReport(
  config: ReportConfig,
  runner: ReportRunner,
): Promise<void> {
  const sg = await Spidergram.load();

  const datasets = config.data ?? {};
  const settings = (config.settings ?? {}) as JsonReportSettings;

  const outputPath = settings.path ?? '';

  if (settings.combine) {
    const curFilePath = `${outputPath}.${settings.type}`;
    const b = Buffer.from(
      settings.type === 'json'
        ? JSON.stringify(datasets, undefined, settings.readable ? 2 : 0)
        : JSON5.stringify(datasets, undefined, settings.readable ? 2 : 0),
    );
    await sg.files('output').write(curFilePath, b);

    runner.status.finished++;
    runner.status.files.push(curFilePath);
  } else {
    if (!(await sg.files('output').exists(outputPath))) {
      await sg.files('output').createDirectory(outputPath);
    }

    for (const [name, data] of Object.entries(datasets)) {
      if (data.length === 0 && settings.includeEmptyResults === false) continue;

      const curFilePath = path.join(outputPath, `${name}.${settings.type}`);

      const b = Buffer.from(
        settings.type === 'json'
          ? JSON.stringify(data, undefined, settings.readable ? 2 : 0)
          : JSON5.stringify(data, undefined, settings.readable ? 2 : 0),
      );

      await sg.files('output').write(curFilePath, b);

      runner.status.finished++;
      runner.status.files.push(curFilePath);
    }
  }

  return Promise.resolve();
}
