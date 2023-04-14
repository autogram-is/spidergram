import { BaseReportSettings, ReportConfig } from "./report-types.js";
import { write as writeCsv } from '@fast-csv/format';
import { Spidergram } from '../index.js';
import { JsonCollection, isJsonArray, isJsonMap } from "@salesforce/ts-types";
import path from "path";


/**
 * Output options specific to Comma and Tab delimited files
 */
export type CsvReportSettings = BaseReportSettings & {
  type: 'csv' | 'tsv',
  delimiter?: string,
  rowDelimiter?: string,
  quote?: string | boolean,
  escape?: string,
  quoteColumns?: boolean,
  quoteHeaders?: boolean,
  headers?: boolean,
  writeHeaders?: boolean,
  includeEndRowDelimiter?: boolean,
  writeBOM?: boolean,
  alwaysWriteHeaders?: boolean
};

export async function outputCsvReport(config: ReportConfig): Promise<void> {
  const sg = await Spidergram.load();

  const datasets = config.data ?? {};
  const settings = (config.settings ?? {}) as CsvReportSettings;

  settings.delimiter ??= (settings.type === 'tsv' ? '\t' : ',');
  const outputPath = settings.path ?? '';

  if (!(await sg.files('output').exists(outputPath))) {
    await sg.files('output').createDirectory(outputPath);
  }

  for (const [name, data] of Object.entries(datasets)) {
    if (data.length === 0 && settings.includeEmptyResults === false) continue;

    if (isJsonArray(data) || isJsonMap(data)) {
      const rows = data as JsonCollection[];
      const curFilePath = path.join(outputPath ?? '', `${name}.${settings.type}`);
      const stream = writeCsv(rows, settings);
      await sg.files('output').writeStream(curFilePath, stream);
    }
  }

  return Promise.resolve();
}