import { ReportSettings, ReportConfig } from "./report-types.js";
import { write as writeCsv } from '@fast-csv/format';
import { Spidergram } from '../index.js';
import { JsonCollection, isJsonArray, isJsonMap } from "@salesforce/ts-types";
import path from "path";

type CsvReportSettings = ReportSettings & {
  delimiter: string
};

export async function outputCsvReport(config: ReportConfig): Promise<void> {
  const sg = await Spidergram.load();

  const datasets = config.data ?? {};
  const settings = (config.settings ?? {}) as CsvReportSettings;

  const format = settings.delimiter === "\t" ? 'tsv' : 'csv';
  const outputPath = settings.path ?? '';

  if (!(await sg.files('output').exists(outputPath))) {
    await sg.files('output').createDirectory(outputPath);
  }

  for (const [name, data] of Object.entries(datasets)) {
    if (data.length === 0 && settings.includeEmptyResults === false) continue;

    if (isJsonArray(data) || isJsonMap(data)) {
      const rows = data as JsonCollection[];
      const curFilePath = path.join(outputPath ?? '', `${name}.${format}`);
      const stream = writeCsv(rows, {
        delimiter: settings.delimiter,
      });
      await sg.files('output').writeStream(curFilePath, stream);
    }
  }

  return Promise.resolve();
}