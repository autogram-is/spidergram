import { Spidergram } from "../config/index.js";
import { FileTools } from "../tools/index.js";
import { BaseReportSettings, ReportConfig } from "./report-types.js";
import { Properties, WorkSheet, ColInfo, CellObject, CellStyle, ExcelDataType, NumberFormat } from "xlsx-js-style";
import xlspkg from 'xlsx-js-style';
const { utils } = xlspkg;

import { ReportRunner } from "./report.js";
import { JsonCollection, isJsonArray, isJsonMap } from "@salesforce/ts-types";
import { DateTime } from "luxon";
import is from "@sindresorhus/is";

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
   * in the report's `data` property; if it exists, the `default` entry will be used
   * as a fallback for sheets with no specific settings.
   */
  sheets?: Record<string, SheetSettings | undefined>
};

type SheetSettings = {
  /**
   * A human-friendly name for the sheet.
   */
  name?: string,

  /**
   * A human-friendly description of the data on the sheet.
   */
  description?: string,

  /**
   * An output template to use when generating the sheet.
   * 
   * - table: A traditional columns/rows data sheet, with styled header
   * - cover: An array of strings to turned into  
   * - inspector: Key/Value pairs, optionally grouped under subheadings.
   */
  template?: 'table' | 'cover' | 'inspector'

  /**
   * Style settings for the sheet's header rows.
   */
  header?: CellStyle,

  /**
   * Settings for individual columns. The settings in the 'default' entry will be
   * applied to all columns.
   */
  columns?: Record<string, ColumnSettings>,
}

type ColumnSettings = {
  /**
   * Override the text of the column's first row.
   */
  title?: string,

  /**
   * Add a hover/tooltip comment to the column's first row.
   */
  comment?: string,

  /**
   * Hide the column from view; its data will still be present and usable in formulas.
   */
  hidden?: boolean,

  /**
   * Adjust the column to the width of its widest row.
   * 
   * @defaultValue true
   */
  autoFit?: boolean,

  /**
   * Hard-code the width of the column. This measurement is in 'approxomate characters,' not pixels.
   */
  width?: number,

  /**
   * The max width for the column. This measurement is in 'approxomate characters,' not pixels.
   * 
   * @defaultValue 80
   */
  maxWidth?: number,

  /**
   * The minimum width for the column. This measurement is in 'approxomate characters,' not pixels.
   * 
   * @defaultValue 5
   */
  minWidth?: number,

  /**
   * Override data type auto-detection. Possible values:
   * 
   * - "b": boolean
   * - "n": number
   * - "s": string
   * - "d": date
   */
  type?: ExcelDataType,

  /**
   * If the data type is set to 'n' or 'd', this format will be used used by Excel
   * when displaying the data. it does not change the underlying cell value.
   */
  format?: NumberFormat,

  /**
   * Attempt to parse and/or coerce the column's data before creating the sheet.
   * This is mostly useful for dates, which are a nightmare: setting 'type' to 'd'
   * and 'parse' to 'true' means Spidergram will ATTEMPT to turn timestamps, ISO dates,
   * and more into "clean" dates.
   */
  parse?: boolean,
}

const sheetDefaults: SheetSettings = {
  header: { font: { bold: true } },
  template: 'table',
  columns: {
    default: {
      autoFit: true,
      maxWidth: 80
    }
  }
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
    if (data.length === 0 && !settings.includeEmptyResults) continue;
    const sheetSettings = settings.sheets[name] || settings.sheets.default || sheetDefaults;

    rpt.addSheet({ name, data }, name.slice(0, 31));
    switch (sheetSettings.template) { 
      case 'table':
        buildTabularSheet(rpt.workbook.Sheets[name], sheetSettings, data);
        break;
      case 'inspector':
        buildInspectorSheet(rpt.workbook.Sheets[name], sheetSettings, data);
        break;
      case 'cover':
        buildCoverSheet(rpt.workbook.Sheets[name], sheetSettings, data);
        break;
    }
  }
  const curFilePath = `${outputPath}.xlsx`;

  await sg
    .files('output')
    .write(curFilePath, rpt.toBuffer({ cellStyles: true, Props: settings.metadata, compression: true }))
    .then(() => {
      runner.status.finished++;
      runner.status.files.push(curFilePath);
    });

  return Promise.resolve();
}

function buildTabularSheet(sheet: WorkSheet, settings: SheetSettings, data: JsonCollection) {
  if (!isJsonArray(data) || !isJsonMap(data[0])) {
    // We can only work with arrays of maps here; in the future we might be able to
    // expand it to deal with other stuff.
    return;
  }

  const firstRow = data[0];
  const colInfo: ColInfo[] = [];
  settings.columns ??= {};

  if (sheet["!ref"]) {
    const range = utils.decode_range(sheet["!ref"]);
    const dense = sheet["!data"];

    const colSettings: ColumnSettings[] = [];
    for (const c of Object.keys(firstRow)) {
      colSettings.push({
        ...settings.columns[c],
        ...settings.columns['default']
      });
    }

    for(let R = 0; R <= range.e.r; ++R) {
      for(let C = 0; C <= range.e.c; ++C) {
        const cell: CellObject = dense ? sheet["!data"]?.[R]?.[C] : sheet[utils.encode_cell({r:R, c:C})];
        const cs = colSettings[C];
  
        if (R === 0) {
          if (cs.comment) { cell.c = [{ t: cs.comment }] }
          if (cs.title) cell.v = cs.title;
          if (settings.header) {
            cell.s = { font: { bold: true } };
          }
        } else {
          if (cs.type) cell.t = cs.type;
          if (cs.format) cell.z = cs.format;
          if (cs.parse && cs.type === 'd') {
            cell.v = desperatelyAttemptToParseDate(cell.v);
          }
        }

        if (cs.autoFit) {
          let rowWidth = cell.v?.toLocaleString().length ?? 0;
          rowWidth = Math.max(1, Math.floor(rowWidth / 5)) * 5;
          colSettings[C].width = Math.max(colSettings[C].width ?? 0, rowWidth);
        }
      }
    }

    for (const cs of colSettings) {
      cs.width = Math.min(cs.maxWidth ?? 120, cs.width ?? 5)
      cs.width = Math.max(cs.minWidth ?? 5, cs.width)
      colInfo.push({
        wch: cs.width,
        hidden: cs.hidden,
      })
    }
    sheet["!cols"] = colInfo;   
  }
}

function buildCoverSheet(sheet: WorkSheet, settings: SheetSettings, data: JsonCollection) {
  // Not yet implemented
  console.log(sheet, settings, data);
}

function buildInspectorSheet(sheet: WorkSheet, settings: SheetSettings, data: JsonCollection) {
  // Not yet implemented
  console.log(sheet, settings, data);
}

function desperatelyAttemptToParseDate(input: string | number | boolean | Date | undefined) {
  let value = input;
  if (is.numericString(value)) {
    value = Number.parseInt(value);
  }

  if (is.number(value)) {
    return DateTime.fromMillis(value).toJSDate();
  } else if (is.string(value)) {
    return DateTime.fromISO(value).toJSDate();
  }

  return value;
}
