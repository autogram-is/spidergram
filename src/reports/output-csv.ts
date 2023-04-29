import { BaseReportSettings, ReportConfig } from './report-types.js';
import { write as writeCsv } from '@fast-csv/format';
import { ReportRunner, Spidergram } from '../index.js';
import { JsonCollection, isJsonArray, isJsonMap } from '@salesforce/ts-types';
import path from 'path';

/**
 * Output options specific to Comma and Tab delimited files
 */
export type CsvReportSettings = BaseReportSettings & {
  /**
   * File format to generate. CSV and TSV are almost identical, differing only in
   * filename and the type of delimiter used to separate columns.
   *
   * @defaultValue 'csv'
   */
  type: 'csv' | 'tsv';

  /**
   * The delmiter used to separate individual columns.
   *
   * @defaultValue `,` when `csv` is selected, `\t` when `tsv` is selected
   */
  delimiter?: string;

  /**
   * The delmiter used to separate each record.
   *
   * @defaultValue `\n`
   */
  rowDelimiter?: string;
  quote?: string | boolean;
  escape?: string;
  quoteColumns?: boolean;
  quoteHeaders?: boolean;
  headers?: boolean;
  writeHeaders?: boolean;
  includeEndRowDelimiter?: boolean;
  writeBOM?: boolean;
  alwaysWriteHeaders?: boolean;
};

export async function outputCsvReport(
  config: ReportConfig,
  runner: ReportRunner,
): Promise<void> {
  const sg = await Spidergram.load();

  const datasets = config.data ?? {};
  const settings = (config.settings ?? {}) as CsvReportSettings;

  settings.delimiter ??= settings.type === 'tsv' ? '\t' : ',';
  const outputPath = settings.path ?? '';

  if (!(await sg.files('output').exists(outputPath))) {
    await sg.files('output').createDirectory(outputPath);
  }

  for (const [name, data] of Object.entries(datasets)) {
    if (data.length === 0 && settings.includeEmptyResults === false) continue;

    if (isJsonArray(data) || isJsonMap(data)) {
      const rows = data as JsonCollection[];
      const curFilePath = path.join(
        outputPath ?? '',
        `${name}.${settings.type}`,
      );
      const stream = writeCsv(rows, settings);
      await sg.files('output').writeStream(curFilePath, stream);

      runner.status.finished++;
      runner.status.files.push(curFilePath);
    }
  }

  return Promise.resolve();
}
