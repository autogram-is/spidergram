import { Spidergram } from "../config/index.js";
import { FileTools } from "../tools/index.js";
import { BaseReportSettings, ReportConfig } from "./report-types.js";
import { Properties } from "xlsx";
import { ReportRunner } from "./report.js";

/**
 * Output options specific to workbook-style spreadsheet files
 */
export type XlsReportSettings = BaseReportSettings & {
  type: 'xlsx',

  /**
   * Internal metadata about the spreadsheet, usually displayed by a program's
   * "document information" command.
   */
  metadata?: Properties

  /**
   * A dictionary of per-sheet configuration options. Each key corresponds to a key
   * in the report's `data` property; if it exists, the `default` key will be used
   * as a fallback for sheets with no specific settings.
   */
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
}

export async function outputXlsxReport(config: ReportConfig, runner: ReportRunner): Promise<void> {
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
      runner.status.finished++;
      runner.status.files.push(curFilePath);
    });

  return Promise.resolve();
}