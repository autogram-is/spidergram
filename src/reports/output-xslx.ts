import { Spidergram } from "../config/index.js";
import { FileTools } from "../tools/index.js";
import { BaseReportSettings, ReportConfig } from "./report-types.js";
import { Properties } from "xlsx";

/**
 * Output options specific to workbook-style spreadsheet files
 */
export type XlsReportSettings = BaseReportSettings & {
  type: 'xlsx',
  metadata?: Properties
  sheets?: Record<string, SheetSettings>
};

type SheetSettings = {
  name?: string,
  headers?: string[],
  skipHeader?: boolean,
  freezeHeader?: boolean,
  columns?: Record<string, ColumnSettings>
}

type ColumnSettings = {
  width: number | boolean,
  parse: 'date' | 'ms' | 'bytes'
}

export async function outputXslxReport(config: ReportConfig): Promise<void> {
  const sg = await Spidergram.load();

  const datasets = config.data ?? {};
  const settings = (config.settings ?? {}) as XlsReportSettings;
  settings.sheets ??= {};
  settings.message ??= {};

  const outputPath = settings.path ?? '';
  const rpt = new FileTools.Spreadsheet();
  rpt.workbook.Props = { ...rpt.workbook.Props, ...settings.metadata };

  for (const [name, data] of Object.entries(datasets)) {
    if (data.length === 0 && settings.includeEmptyResults === false) continue;

    if (settings.sheets[name]) {
      // Do sheet specific formatting stuff here
    }

    rpt.addSheet(data, name.slice(0, 31));
  }
  const curFilePath = `${outputPath}.xlsx`;

  await sg
    .files('output')
    .write(curFilePath, rpt.toBuffer())
    .then(() => {
      // this.status.finished++;
      // this.status.files.push(curFilePath);
    });


  return Promise.resolve();
}